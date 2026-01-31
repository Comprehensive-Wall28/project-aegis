import { Test, TestingModule } from '@nestjs/testing';
import { WebsocketGateway } from './websocket.gateway';

describe('WebsocketGateway', () => {
    let gateway: WebsocketGateway;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [WebsocketGateway],
        }).compile();

        gateway = module.get<WebsocketGateway>(WebsocketGateway);
    });

    it('should be defined', () => {
        expect(gateway).toBeDefined();
    });

    describe('handleJoinRoom', () => {
        it('should call socket.join', () => {
            const mockSocket = {
                id: '123',
                join: jest.fn(),
            } as any;
            const roomId = 'room1';

            gateway.handleJoinRoom(mockSocket, roomId);

            expect(mockSocket.join).toHaveBeenCalledWith(roomId);
        });
    });

    describe('handleLeaveRoom', () => {
        it('should call socket.leave', () => {
            const mockSocket = {
                id: '123',
                leave: jest.fn(),
            } as any;
            const roomId = 'room1';

            gateway.handleLeaveRoom(mockSocket, roomId);

            expect(mockSocket.leave).toHaveBeenCalledWith(roomId);
        });
    });
});
