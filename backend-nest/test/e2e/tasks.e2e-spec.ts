import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ExecutionContext } from '@nestjs/common';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { getModelToken } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module'; // Adjust path
import { Task } from '../../src/modules/tasks/schemas/task.schema'; // Adjust path
import { JwtAuthGuard } from '../../src/modules/auth/guards/jwt-auth.guard'; // Adjust path

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

describe('TasksController (E2E)', () => {
  let app: NestFastifyApplication;
  const userId = new Types.ObjectId();

  const mockTask = {
    _id: new Types.ObjectId(),
    userId: userId,
    encryptedData: 'mock-data',
    encapsulatedKey: 'mock-key',
    encryptedSymmetricKey: 'mock-sym-key',
    priority: 'medium',
    status: 'todo',
    recordHash: 'mock-hash',
    mentions: [],
    createdAt: new Date(),
    updatedAt: new Date(),
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

  const mockTaskModel = {
    create: jest.fn().mockImplementation((dto) => ({
      ...mockTask,
      ...dto,
      _id: new Types.ObjectId(),
      save: jest.fn().mockResolvedValue(true),
    })),
    find: jest.fn().mockImplementation(() => createMockQuery([mockTask])),
    findOne: jest.fn().mockImplementation(() => createMockQuery(mockTask)),
    findById: jest.fn().mockImplementation(() => createMockQuery(mockTask)),
    findOneAndUpdate: jest
      .fn()
      .mockImplementation(() => createMockQuery(mockTask)),
    findOneAndDelete: jest
      .fn()
      .mockImplementation(() => createMockQuery(mockTask)),
    countDocuments: jest.fn().mockImplementation(() => createMockQuery(1)),
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(getModelToken(Task.name))
      .useValue(mockTaskModel)
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate: (context: ExecutionContext) => {
          const req = context.switchToHttp().getRequest();
          req.user = { userId: userId.toString(), email: 'test@example.com' };
          return true;
        },
      })
      .compile();

    app = moduleFixture.createNestApplication<NestFastifyApplication>(
      new FastifyAdapter(),
    );
    app.setGlobalPrefix('api');

    // Register cookie just in case, though we bypassed AuthGuard
    await app.register(require('@fastify/cookie'), {
      secret: 'test-secret',
    });

    await app.init();
    await app.getHttpAdapter().getInstance().ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it('/api/tasks (POST)', () => {
    const createTaskDto = {
      encryptedData: 'data',
      encapsulatedKey: 'key',
      encryptedSymmetricKey: 'symkey',
      recordHash: 'hash',
      priority: 'high',
      status: 'todo',
    };

    return request
      .agent(app.getHttpServer())
      .post('/api/tasks')
      .send(createTaskDto)
      .expect(201)
      .expect((res) => {
        expect(res.body).toHaveProperty('encryptedData', 'data');
      });
  });

  it('/api/tasks (GET)', () => {
    return request
      .agent(app.getHttpServer())
      .get('/api/tasks')
      .expect(200)
      .expect((res) => {
        expect(Array.isArray(res.body)).toBe(true);
      });
  });

  it('/api/tasks/:id (GET)', () => {
    return request
      .agent(app.getHttpServer())
      .get(`/api/tasks/${mockTask._id}`)
      .expect(200)
      .expect((res) => {
        expect(res.body).toHaveProperty('_id');
      });
  });

  it('/api/tasks/:id (PUT)', () => {
    return request
      .agent(app.getHttpServer())
      .put(`/api/tasks/${mockTask._id}`)
      .send({ priority: 'low' })
      .expect(200);
  });

  it('/api/tasks/:id (DELETE)', () => {
    return request
      .agent(app.getHttpServer())
      .delete(`/api/tasks/${mockTask._id}`)
      .expect(200);
  });
});
