import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ExecutionContext } from '@nestjs/common';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { getModelToken } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';
import { CalendarEvent } from '../../src/modules/calendar/schemas/calendar-event.schema';
import { JwtAuthGuard } from '../../src/modules/auth/guards/jwt-auth.guard';

// Mock p-queue to avoid ESM issues
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

describe('CalendarController (E2E)', () => {
    let app: NestFastifyApplication;
    const userId = new Types.ObjectId();

    const mockEvent = {
        _id: new Types.ObjectId(),
        userId: userId,
        encryptedData: 'mock-encrypted-data',
        encapsulatedKey: 'mock-key',
        encryptedSymmetricKey: 'mock-sym-key',
        startDate: new Date(),
        endDate: new Date(),
        isAllDay: false,
        elementId: 'mock-element-id',
        recordHash: 'mock-hash',
        mentions: [],
        save: jest.fn().mockResolvedValue(true),
        toJSON: jest.fn().mockReturnThis(),
        toObject: jest.fn().mockReturnThis(),
    };

    const createMockQuery = (result: any) => ({
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnThis(),
        populate: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(result),
    });

    const mockCalendarModel = {
        create: jest.fn().mockImplementation((dto) => ({
            ...mockEvent,
            ...dto,
            _id: new Types.ObjectId(),
            save: jest.fn().mockResolvedValue(true),
        })),
        find: jest.fn().mockImplementation(() => createMockQuery([mockEvent])),
        findOne: jest.fn().mockImplementation(() => createMockQuery(mockEvent)),
        findById: jest.fn().mockImplementation(() => createMockQuery(mockEvent)),
        findOneAndUpdate: jest.fn().mockImplementation(() => createMockQuery(mockEvent)),
        findOneAndDelete: jest.fn().mockImplementation(() => createMockQuery(mockEvent)),
        findByIdAndUpdate: jest.fn().mockImplementation(() => createMockQuery(mockEvent)),
        findByIdAndDelete: jest.fn().mockImplementation(() => createMockQuery(mockEvent)),
        countDocuments: jest.fn().mockImplementation(() => createMockQuery(1)),
    };

    beforeAll(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [AppModule],
        })
            .overrideProvider(getModelToken(CalendarEvent.name))
            .useValue(mockCalendarModel)
            .overrideGuard(JwtAuthGuard)
            .useValue({
                canActivate: (context: ExecutionContext) => {
                    const req = context.switchToHttp().getRequest();
                    req.user = { userId: userId.toString(), email: 'test@example.com' };
                    return true;
                }
            })
            .compile();

        app = moduleFixture.createNestApplication<NestFastifyApplication>(
            new FastifyAdapter(),
        );
        app.setGlobalPrefix('api');

        await app.register(require('@fastify/cookie'), {
            secret: 'test-secret',
        });

        await app.init();
        await app.getHttpAdapter().getInstance().ready();
    });

    afterAll(async () => {
        await app.close();
    });

    it('/api/calendar (POST)', () => {
        const createEventDto = {
            encryptedData: 'new-encrypted-data',
            encapsulatedKey: 'new-key',
            encryptedSymmetricKey: 'new-sym-key',
            startDate: new Date().toISOString(),
            endDate: new Date().toISOString(),
            isAllDay: false,
            recordHash: 'new-hash',
        };

        return request.agent(app.getHttpServer())
            .post('/api/calendar')
            .send(createEventDto)
            .expect(201)
            .expect((res) => {
                expect(res.body).toHaveProperty('encapsulatedKey', 'new-key');
            });
    });

    it('/api/calendar (GET)', () => {
        return request.agent(app.getHttpServer())
            .get('/api/calendar')
            .expect(200)
            .expect((res) => {
                expect(Array.isArray(res.body)).toBe(true);
            });
    });

    it('/api/calendar (GET) with query params', () => {
        return request.agent(app.getHttpServer())
            .get('/api/calendar')
            .query({ start: new Date().toISOString(), end: new Date().toISOString() })
            .expect(200);
    });

    it('/api/calendar/:id (PATCH)', () => {
        return request.agent(app.getHttpServer())
            .patch(`/api/calendar/${mockEvent._id}`)
            .send({
                encryptedData: 'updated-data',
            })
            .expect(200);
    });

    it('/api/calendar/:id (DELETE)', () => {
        return request.agent(app.getHttpServer())
            .delete(`/api/calendar/${mockEvent._id}`)
            .expect(200);
    });
});
