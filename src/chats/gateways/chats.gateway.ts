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
    const user = client.data.user;

    if (client.data.roomId && client.data.roomId !== roomId) {
      await this.updateMemberLastChatId(roomId, user.id);
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
    const chatId = await this.getNextChatId(roomId);

    // 전송 시간
    const sendTime = new Date();

    // 채팅 데이터 저장
    await this.chatsService.createChat({
      roomId,
      chatId,
      type: 'Message',
      userId: user.id,
      message,
      createdAt: sendTime,
    });

    // 채팅방 업데이트
    await this.updateRoom(roomId, sendTime.getTime().toString());

    // 채팅방 멤버 목록 조회
    const members = await this.getMemberUserIds(roomId);

    // 채팅방 멤버들에게 메시지 전송
    const promises = members.map(async (userId) => {
      const socketId = await this.cacheService.get(`socket:${userId}`);

      // 메시지 데이터
      const messageData = {
        roomId,
        chatId,
        userId: user.id,
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

  /* 채팅방 업데이트 */
  private async updateRoom(roomId: string, updatedAt: string): Promise<void> {
    // Lock 여부 확인
    const isLocked = await this.cacheService.get(`room:lock:${roomId}`);
    if (isLocked) {
      return;
    }

    // 마지막 채팅 ID
    const chatId = await this.getLastChatId(roomId);

    // 채팅방 업데이트
    await this.prismaService.rooms.updateMany({
      where: { id: roomId },
      data: { lastChatId: chatId, updatedAt },
    });

    // Lock 걸기
    await this.cacheService.set(`room:lock:${roomId}`, 'Y', 100);
  }

  /* 마지막으로 조회한 채팅 ID 업데이트 */
  private async updateMemberLastChatId(
    roomId: string,
    userId: string,
  ): Promise<void> {
    const lastChatId = await this.getLastChatId(roomId);

    // 멤버가 읽은 마지막 채팅 ID 업데이트
    await this.prismaService.members.updateMany({
      where: { userId, roomId },
      data: { lastReadChatId: lastChatId },
    });
  }

  /* 다음 채팅 ID 조회 */
  private async getLastChatId(roomId: string): Promise<number> {
    // 만약 캐싱되어 있는 경우
    const cachedLastChatId = await this.cacheService.get(`chat:id:${roomId}`);
    if (cachedLastChatId) {
      return +cachedLastChatId;
    }

    // 캐싱되어 있지 않은 경우 DynamoDB에서 조회
    const lastChatId = await this.chatsService.getLastChatId(roomId);

    // 마지막 채팅 ID 캐싱
    await this.cacheService.set(`chat:id:${roomId}`, lastChatId);

    // TTL 적용
    await this.cacheService.expire(`chat:id:${roomId}`, 3600);
    return lastChatId;
  }

  private async getNextChatId(roomId: string): Promise<number> {
    const isChatIdCached = await this.cacheService.exists(`chat:id:${roomId}`);

    // 캐싱되어 있지 않다면 캐싱
    if (!isChatIdCached) {
      await this.getLastChatId(roomId);
    }
    return this.cacheService.incrby(`chat:id:${roomId}`, 1);
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
    const userIds = members.map(({ userId }) => userId.toString());

    // 멤버 정보 캐싱
    await this.cacheService.sadd(`members:${roomId}`, userIds);
    await this.cacheService.expire(`members:${roomId}`, 3600);
    return userIds;
  }
}
