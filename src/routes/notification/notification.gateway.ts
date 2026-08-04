import { Logger } from '@nestjs/common';
import { OnGatewayConnection, OnGatewayDisconnect, WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { generateRoomUserId } from 'src/shared/helpers';
import { SharedWebsocketRepository } from 'src/shared/repositories/shared-websocket.repo';
import { TokenService } from 'src/shared/services/token.service';

@WebSocketGateway({
  namespace: 'notifications',
  cors: {
    origin: true,
    credentials: true,
  },
})
export class NotificationGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(NotificationGateway.name);

  @WebSocketServer()
  server: Server;

  constructor(
    private readonly tokenService: TokenService,
    private readonly websocketRepo: SharedWebsocketRepository,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const token = client.handshake.auth?.token as string | undefined;
      if (!token) {
        client.disconnect();
        return;
      }
      const payload = await this.tokenService.verifyAccessToken(token);
      await client.join(generateRoomUserId(payload.userId));
      await this.websocketRepo.create({ id: client.id, userId: payload.userId });
    } catch (error) {
      this.logger.warn(`Kết nối socket bị từ chối: ${(error as Error).message}`);
      client.disconnect();
    }
  }

  async handleDisconnect(client: Socket) {
    await this.websocketRepo.delete(client.id).catch(() => undefined);
  }

  emitToUser(userId: number, notification: unknown) {
    this.server.to(generateRoomUserId(userId)).emit('notification', notification);
  }
}
