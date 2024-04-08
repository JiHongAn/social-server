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
import { RoomsService } from '../../rooms/services/rooms.service';

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
    private readonly roomsService: RoomsService,
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
      await this.roomsService.updateMemberLastChatId(roomId, user.id);
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
      await this.roomsService.getRoomLastChatId(roomId);
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
    await this.roomsService.updateMemberLastChatId(roomId, user.id);
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
    const members = await this.roomsService.getMemberUserIds(roomId);

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
}
