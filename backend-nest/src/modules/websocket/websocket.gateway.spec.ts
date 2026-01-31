import { Test, TestingModule } from '@nestjs/testing';
import { WebsocketGateway } from './websocket.gateway';
import { Socket, Server } from 'socket.io';

describe('WebsocketGateway', () => {
    let gateway: WebsocketGateway;
    let mockServer: Partial<Server>;
    let mockSocket: Partial<Socket>;

    beforeEach(async () => {
        mockServer = {
            to: jest.fn().mockReturnThis(),
            emit: jest.fn(),
        };

        mockSocket = {
            id: 'socket-id',
            join: jest.fn(),
            leave: jest.fn(),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [WebsocketGateway],
        }).compile();

        gateway = module.get<WebsocketGateway>(WebsocketGateway);
        gateway.server = mockServer as Server;
    });

    it('should be defined', () => {
        expect(gateway).toBeDefined();
    });

    it('handleConnection should log', () => {
        const spy = jest.spyOn((gateway as any).logger, 'log');
        gateway.handleConnection(mockSocket as Socket);
        expect(spy).toHaveBeenCalledWith(expect.stringContaining('Client connected'));
    });

    it('handleDisconnect should log', () => {
        const spy = jest.spyOn((gateway as any).logger, 'log');
        gateway.handleDisconnect(mockSocket as Socket);
        expect(spy).toHaveBeenCalledWith(expect.stringContaining('Client disconnected'));
    });

    it('handleJoinRoom should join room', () => {
        gateway.handleJoinRoom(mockSocket as Socket, 'room1');
        expect(mockSocket.join).toHaveBeenCalledWith('room1');
    });

    it('handleLeaveRoom should leave room', () => {
        gateway.handleLeaveRoom(mockSocket as Socket, 'room1');
        expect(mockSocket.leave).toHaveBeenCalledWith('room1');
    });

    it('broadcastToRoom should emit event', () => {
        gateway.broadcastToRoom('room1', 'event', { data: 1 });
        expect(mockServer.to).toHaveBeenCalledWith('room1');
        expect(mockServer.emit).toHaveBeenCalledWith('event', { data: 1 });
    });
});
