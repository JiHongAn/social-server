import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { AuthService } from '../../auth/services/auth.service';
import { CacheService } from '../../cache/services/cache.service';
import { PrismaService } from '../../prisma/services/prisma.service';
import { ChatsService } from '../services/chats.service';
import { addFcmSQS } from '../../libs/utils/sqs';

@WebSocketGateway({
  namespace: 'chats',
  cors: { origin: '*' },
})
export class ChatsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  constructor(
    private readonly authService: AuthService,
    private readonly cacheService: CacheService,
    private readonly prismaService: PrismaService,
    private readonly chatsService: ChatsService,
  ) {}

  @WebSocketServer()
  private server: Server;

  /**
   * Connect
   */
  async handleConnection(@ConnectedSocket() client: Socket): Promise<void> {
    try {
      const token = client.handshake.auth.token;

      // Access Token 검증
      const user = this.authService.verifyAccessToken(token);
      client.data.user = user;

      // Socket Id 캐싱
      await this.cacheService.set(`socket:${user.id}`, client.id);
    } catch (e) {
      client.disconnect();
    }
  }

  /**
   * Disconnect
   */
  async handleDisconnect(client: Socket): Promise<void> {
    const user = client.data.user;

    // Room Id 조회
    const roomId = client.data.roomId;

    // Room Id가 있다면
    if (roomId) {
      await this.updateMemberLastChatId(roomId, user.id);
    }

    // Socket Id 삭제
    await this.cacheService.del(`socket:${user.id}`);
  }

  /**
   * 채팅방 입장
   */
  @SubscribeMessage('enterRoom')
  async enterRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() { roomId }: { roomId: string },
  ): Promise<void> {
    const chatId = await this.cacheService.get(`chat:id:${roomId}`);

    // 캐싱된 Chat Id가 없다면
    if (!chatId) {
      await this.getRoomLastChatId(roomId);
    }

    // Client Id 저장
    client.data.roomId = roomId;
  }

  /**
   * Exit Room
   */
  @SubscribeMessage('exitRoom')
  async exitRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() { roomId }: { roomId: string },
  ): Promise<void> {
    client.data.roomId = null;

    // User 조회
    const user = client.data.user;

    // 마지막 조회 채팅 ID 업데이트
    await this.updateMemberLastChatId(roomId, user.id);
  }

  /**
   * 메시지 전송
   */
  @SubscribeMessage('sendMessage')
  async sendMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() { roomId, message }: { roomId: string; message: string },
  ): Promise<void> {
    const user = client.data.user;

    // Chat Id 조회
    const chatId = await this.cacheService.incrby(`chat:id:${roomId}`, 1);

    // 전송 시간
    const sendTime = new Date();

    // 채팅 데이터 저장
    await this.chatsService.createChat({
      roomId,
      chatId,
      userId: user.id,
      message,
      createdAt: sendTime,
    });

    // 마지막 전송 시간 업데이트
    await this.prismaService.rooms.updateMany({
      where: { id: roomId },
      data: { lastChatId: chatId, updatedAt: Date.now().toString() },
    });

    // 채팅방 멤버 목록 조회
    const members = await this.getMemberUserIds(roomId);

    // 채팅방 멤버들에게 메시지 전송
    const promises = members.map(async (userId) => {
      const socketId = await this.cacheService.get(`socket:${userId}`);

      // 메시지 데이터
      const messageData = {
        userId: user.id,
        nickname: user.nickname,
        profileUrl: user.profileUrl,
        message,
        createdAt: sendTime,
      };

      // 온라인 유저라면
      if (socketId) {
        return this.server.to(socketId).emit('message', messageData);
      }

      // 오프라인 유저라면 FCM 전송
      return addFcmSQS(JSON.stringify(messageData));
    });
    await Promise.allSettled(promises);
  }

  /* 마지막으로 조회한 채팅 ID 업데이트 */
  private async updateMemberLastChatId(
    roomId: string,
    userId: number,
  ): Promise<void> {
    const lastChatId = await this.getRoomLastChatId(roomId);

    // 멤버가 읽은 마지막 채팅 ID 업데이트
    await this.prismaService.members.updateMany({
      where: { userId, roomId },
      data: { lastChatId },
    });
  }

  /* 채팅방의 마지막 Chat Id 조회 */
  private async getRoomLastChatId(roomId: string): Promise<number> {
    // 캐싱된 lastChatId 리턴
    const lastChatId = await this.cacheService.get(`chat:id:${roomId}`);
    if (lastChatId) {
      return +lastChatId;
    }

    // DB에서 조회
    const room = await this.prismaService.rooms.findUnique({
      where: { id: roomId },
      select: { lastChatId: true },
    });

    // 캐싱
    await this.cacheService.set(`chat:id:${roomId}`, room.lastChatId);
    return room.lastChatId;
  }

  /* 멤버들의 user ID 목록 조회 */
  private async getMemberUserIds(roomId: string): Promise<string[]> {
    // 캐싱된 member들의 user ID 목록 리턴
    const memberUserIds = await this.cacheService.smembers(`members:${roomId}`);
    if (memberUserIds.length > 0) {
      return memberUserIds;
    }

    // DB에 저장된 member들의 userId 목록 리턴
    const members = await this.prismaService.members.findMany({
      where: { roomId },
      select: { userId: true },
    });
    return members.map(({ userId }) => userId.toString());
  }
}
