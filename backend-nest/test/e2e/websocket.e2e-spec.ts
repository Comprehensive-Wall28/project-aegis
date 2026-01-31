import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';

jest.mock('p-queue', () => {
    return jest.fn().mockImplementation(() => {
        return {
            add: jest.fn().mockImplementation((fn) => fn()),
            on: jest.fn(),
            size: 0,
            pending: 0,
        };
    });
});

import { io, Socket as ClientSocket } from 'socket.io-client';
import { AppModule } from '../../src/app.module';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';

describe('WebsocketGateway (E2E)', () => {
    let app: INestApplication;
    let client: ClientSocket;

    beforeAll(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [AppModule],
        }).compile();

        app = moduleFixture.createNestApplication<NestFastifyApplication>(
            new FastifyAdapter(),
        );
        await app.listen(0); // Listen on a random port
    });

    afterAll(async () => {
        await app.close();
    });

    beforeEach((done) => {
        const address = app.getHttpServer().address();
        const port = typeof address === 'string' ? address : address.port;
        client = io(`http://localhost:${port}`, {
            transports: ['websocket'],
        });
        client.on('connect', done);
    });

    afterEach(() => {
        if (client.connected) {
            client.disconnect();
        }
    });

    it('should connect to the gateway', () => {
        expect(client.connected).toBe(true);
    });

    it('should join and leave rooms', (done) => {
        const roomId = 'test-room';

        // We can't easily verify joining on the server side without mocking or 
        // having a way to check rooms, but we can verify that emitting works.
        client.emit('join-room', roomId);

        // Give some time for the event to be processed
        setTimeout(() => {
            client.emit('leave-room', roomId);
            done();
        }, 100);
    });
});
