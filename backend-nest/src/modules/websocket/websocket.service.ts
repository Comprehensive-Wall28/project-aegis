import { Injectable } from '@nestjs/common';
import { WebsocketGateway } from './websocket.gateway';

@Injectable()
export class WebsocketService {
    constructor(private readonly websocketGateway: WebsocketGateway) { }

    broadcastToRoom(roomId: string, event: string, data: any): void {
        this.websocketGateway.broadcastToRoom(roomId, event, data);
    }
}
