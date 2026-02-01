import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ExecutionContext } from '@nestjs/common';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { getModelToken } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';
import { Folder } from '../../src/modules/folders/schemas/folder.schema';
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

describe('FoldersController (E2E)', () => {
  let app: NestFastifyApplication;
  const userId = new Types.ObjectId();

  const mockFolder = {
    _id: new Types.ObjectId(),
    ownerId: userId,
    name: 'Mock Folder',
    parentId: null,
    encryptedSessionKey: 'mock-session-key',
    isShared: false,
    color: '#ffffff',
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

  const mockFolderModel = {
    create: jest.fn().mockImplementation((dto) => ({
      ...mockFolder,
      ...dto,
      _id: new Types.ObjectId(),
      save: jest.fn().mockResolvedValue(true),
    })),
    find: jest.fn().mockImplementation(() => createMockQuery([mockFolder])),
    findOne: jest.fn().mockImplementation(() => createMockQuery(mockFolder)),
    findById: jest.fn().mockImplementation(() => createMockQuery(mockFolder)),
    findOneAndUpdate: jest
      .fn()
      .mockImplementation(() => createMockQuery(mockFolder)),
    findOneAndDelete: jest
      .fn()
      .mockImplementation(() => createMockQuery(mockFolder)),
    findByIdAndUpdate: jest
      .fn()
      .mockImplementation(() => createMockQuery(mockFolder)),
    findByIdAndDelete: jest
      .fn()
      .mockImplementation(() => createMockQuery(mockFolder)),
    countDocuments: jest.fn().mockImplementation(() => createMockQuery(0)),
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(getModelToken(Folder.name))
      .useValue(mockFolderModel)
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

    await app.register(require('@fastify/cookie'), {
      secret: 'test-secret',
    });

    await app.init();
    await app.getHttpAdapter().getInstance().ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it('/api/folders (POST)', () => {
    const createFolderDto = {
      name: 'New Folder',
      encryptedSessionKey: 'new-key',
      color: '#000000',
    };

    return request
      .agent(app.getHttpServer())
      .post('/api/folders')
      .send(createFolderDto)
      .expect(201)
      .expect((res) => {
        expect(res.body).toHaveProperty('name', 'New Folder');
      });
  });

  it('/api/folders (GET)', () => {
    return request
      .agent(app.getHttpServer())
      .get('/api/folders')
      .expect(200)
      .expect((res) => {
        expect(Array.isArray(res.body)).toBe(true);
      });
  });

  it('/api/folders/:id (GET)', () => {
    return request
      .agent(app.getHttpServer())
      .get(`/api/folders/${mockFolder._id}`)
      .expect(200);
  });

  it('/api/folders/:id (PATCH)', () => {
    return request
      .agent(app.getHttpServer())
      .patch(`/api/folders/${mockFolder._id}`)
      .send({
        name: 'Updated Folder',
      })
      .expect(200);
  });

  it('/api/folders/:id (DELETE)', () => {
    // Mock findOne to return folder with no children if logic checks for it?
    // Basic mock returns 1 mockFolder, assuming logic doesn't recursive check explicitly against same model in a way that blocks.
    // If DELETE checks usage, might need mock adjustment. But basic delete depends on service logic.
    return request
      .agent(app.getHttpServer())
      .delete(`/api/folders/${mockFolder._id}`)
      .expect(200);
  });
});
