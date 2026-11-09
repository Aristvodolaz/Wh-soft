import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, UseGuards } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { OnEvent } from '@nestjs/event-emitter';
import { DomainEvent } from '../../shared/domain/domain-event.base';

interface AuthenticatedSocket extends Socket {
  userId?: string;
  tenantId?: string;
  warehouseId?: string;
}

/**
 * WebSocket Gateway for real-time WMS events.
 * 
 * Clients connect via: ws://localhost:3030/ws?token=<JWT>
 * Events are broadcast to all authenticated clients in the same tenant.
 */
@WebSocketGateway({
  namespace: '/ws',
  cors: {
    origin: '*', // Configure properly in production
    credentials: true,
  },
  transports: ['websocket', 'polling'],
})
export class WmsWebSocketGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(WmsWebSocketGateway.name);
  private readonly connectedClients = new Map<string, AuthenticatedSocket>();

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  afterInit() {
    this.logger.log('WebSocket Gateway initialized');
  }

  async handleConnection(client: AuthenticatedSocket) {
    try {
      // Extract token from query params: ?token=xxx
      const token = client.handshake.query.token as string;
      if (!token) {
        this.logger.warn(`Client ${client.id} connected without token`);
        client.disconnect();
        return;
      }

      // Verify JWT
      const secret = this.configService.get<string>('jwt.secret');
      const payload = await this.jwtService.verifyAsync(token, { secret });

      // Attach user info to socket
      client.userId = payload.sub;
      client.tenantId = payload.tenantId;
      client.warehouseId = payload.warehouseId;

      this.connectedClients.set(client.id, client);
      this.logger.log(
        `Client connected: ${client.id} (user: ${client.userId}, tenant: ${client.tenantId})`,
      );

      // Send welcome message
      client.emit('connected', {
        message: 'Connected to WMS WebSocket',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      this.logger.warn(
        `Client ${client.id} failed authentication: ${error.message}`,
      );
      client.disconnect();
    }
  }

  handleDisconnect(client: AuthenticatedSocket) {
    this.connectedClients.delete(client.id);
    this.logger.log(
      `Client disconnected: ${client.id} (user: ${client.userId})`,
    );
  }

  /**
   * Listen to all domain events and broadcast to relevant clients.
   * Events are filtered by tenantId to ensure multi-tenancy isolation.
   */
  @OnEvent('**', { async: true })
  async handleDomainEvent(event: DomainEvent) {
    if (!event || !event.eventName) return;

    // Filter clients by tenant
    const recipients = Array.from(this.connectedClients.values()).filter(
      (client) => client.tenantId === event.tenantId,
    );

    if (recipients.length === 0) return;

    const payload = {
      type: event.eventName,
      payload: event.payload || {},
      tenantId: event.tenantId,
      warehouseId: (event.payload as any)?.warehouseId,
      timestamp: event.occurredAt.toISOString(),
    };

    this.logger.debug(
      `Broadcasting ${event.eventName} to ${recipients.length} clients`,
    );

    recipients.forEach((client) => {
      client.emit('event', payload);
    });
  }

  /**
   * Broadcast a custom message to all clients in a tenant.
   */
  broadcastToTenant(tenantId: string, eventType: string, data: any) {
    const recipients = Array.from(this.connectedClients.values()).filter(
      (client) => client.tenantId === tenantId,
    );

    const payload = {
      type: eventType,
      payload: data,
      tenantId,
      timestamp: new Date().toISOString(),
    };

    recipients.forEach((client) => {
      client.emit('event', payload);
    });
  }
}
