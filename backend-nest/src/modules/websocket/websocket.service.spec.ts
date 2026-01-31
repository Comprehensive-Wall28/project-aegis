import { Test, TestingModule } from '@nestjs/testing';
import { WebsocketService } from './websocket.service';
import { WebsocketGateway } from './websocket.gateway';

describe('WebsocketService', () => {
    let service: WebsocketService;
    let gateway: WebsocketGateway;

    const mockWebsocketGateway = {
        broadcastToRoom: jest.fn(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                WebsocketService,
                {
                    provide: WebsocketGateway,
                    useValue: mockWebsocketGateway,
                },
            ],
        }).compile();

        service = module.get<WebsocketService>(WebsocketService);
        gateway = module.get<WebsocketGateway>(WebsocketGateway);
        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('broadcastToRoom', () => {
        it('should call gateway.broadcastToRoom', () => {
            const roomId = 'room1';
            const event = 'testEvent';
            const data = { foo: 'bar' };

            service.broadcastToRoom(roomId, event, data);

            expect(gateway.broadcastToRoom).toHaveBeenCalledWith(roomId, event, data);
        });
    });
});
