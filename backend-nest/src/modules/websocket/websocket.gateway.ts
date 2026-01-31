import {
    SubscribeMessage,
    WebSocketGateway,
    OnGatewayInit,
    WebSocketServer,
    OnGatewayConnection,
    OnGatewayDisconnect,
    ConnectedSocket,
    MessageBody,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Socket, Server } from 'socket.io';

@WebSocketGateway({
    cors: {
        origin: process.env.CLIENT_ORIGIN || '*', // In production, this should be restricted to allowed origins
        methods: ['GET', 'POST'],
        credentials: true,
    },
})
export class WebsocketGateway
    implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
    @WebSocketServer() server!: Server;
    private logger: Logger = new Logger('WebsocketGateway');

    afterInit(server: Server) {
        this.logger.log('Init');
    }

    handleDisconnect(client: Socket) {
        this.logger.log(`Client disconnected: ${client.id}`);
    }

    handleConnection(client: Socket, ...args: any[]) {
        this.logger.log(`Client connected: ${client.id}`);
    }

    @SubscribeMessage('join-room')
    handleJoinRoom(
        @ConnectedSocket() client: Socket,
        @MessageBody() roomId: string,
    ): void {
        this.logger.log(`Client ${client.id} joining room: ${roomId}`);
        client.join(roomId);
    }

    @SubscribeMessage('leave-room')
    handleLeaveRoom(
        @ConnectedSocket() client: Socket,
        @MessageBody() roomId: string,
    ): void {
        this.logger.log(`Client ${client.id} leaving room: ${roomId}`);
        client.leave(roomId);
    }

    broadcastToRoom(roomId: string, event: string, data: any): void {
        this.server.to(roomId).emit(event, data);
    }
}
