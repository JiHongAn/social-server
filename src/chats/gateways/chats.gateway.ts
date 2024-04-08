import {
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { AuthService } from '../../auth/services/auth.service';
import { CacheService } from '../../cache/services/cache.service';

@WebSocketGateway({
  namespace: 'chats',
  cors: { origin: '*' },
})
export class ChatsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  constructor(
    private readonly authService: AuthService,
    private readonly cacheService: CacheService,
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

    // Socket Id 삭제
    await this.cacheService.del(`socket:${user.id}`);
  }
}
