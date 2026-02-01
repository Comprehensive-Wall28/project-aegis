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
import { Note } from '../../src/modules/notes/schemas/note.schema';
import { NoteFolder } from '../../src/modules/notes/schemas/note-folder.schema';
import { JwtAuthGuard } from '../../src/modules/auth/guards/jwt-auth.guard';

import { GridFsService } from '../../src/modules/vault/gridfs.service';

// Mock p-queue
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

describe('NotesController (E2E)', () => {
  let app: NestFastifyApplication;
  const userId = new Types.ObjectId();
  const folderId = new Types.ObjectId();

  const mockFolder = {
    _id: folderId,
    userId: userId,
    name: 'My Folder',
    parent: null,
    save: jest.fn().mockResolvedValue(true),
    toJSON: jest.fn().mockReturnThis(),
    toObject: jest.fn().mockReturnThis(),
  };

  const mockNote = {
    _id: new Types.ObjectId(),
    userId: userId,
    encapsulatedKey: 'mock-key',
    encryptedSymmetricKey: 'mock-sym-key',
    gridFsFileId: new Types.ObjectId(), // Added this
    recordHash: 'mock-hash',
    noteFolderId: folderId,
    tags: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    save: jest.fn().mockResolvedValue(true),
    toJSON: jest.fn().mockReturnThis(),
    toObject: jest.fn().mockReturnThis(),
  };

  const mockGridFsService = {
    uploadBuffer: jest.fn().mockResolvedValue(new Types.ObjectId()),
    downloadToBuffer: jest.fn().mockResolvedValue(Buffer.from('mock-content')),
    deleteFile: jest.fn().mockResolvedValue(true),
  };

  // ... createMockQuery helper ...
  const createMockQuery = (result: any) => ({
    sort: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    lean: jest.fn().mockReturnThis(),
    populate: jest.fn().mockReturnThis(),
    exec: jest.fn().mockResolvedValue(result),
  });

  const mockNoteModel = {
    create: jest.fn().mockImplementation((dto) => ({
      ...mockNote,
      ...dto,
      _id: new Types.ObjectId(),
      save: jest.fn().mockResolvedValue(true),
    })),
    find: jest.fn().mockImplementation(() => createMockQuery([mockNote])),
    findOne: jest.fn().mockImplementation(() => createMockQuery(mockNote)),
    findById: jest.fn().mockImplementation(() => createMockQuery(mockNote)),
    findOneAndUpdate: jest
      .fn()
      .mockImplementation(() => createMockQuery(mockNote)),
    findOneAndDelete: jest
      .fn()
      .mockImplementation(() => createMockQuery(mockNote)),
    countDocuments: jest.fn().mockImplementation(() => createMockQuery(1)),
  };

  // ... mockFolderModel ...
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
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(getModelToken(Note.name))
      .useValue(mockNoteModel)
      .overrideProvider(getModelToken(NoteFolder.name))
      .useValue(mockFolderModel)
      .overrideProvider(GridFsService)
      .useValue(mockGridFsService)
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate: (context: ExecutionContext) => {
          const req = context.switchToHttp().getRequest();
          req.user = { userId: userId.toString(), email: 'test@example.com' };
          return true;
        },
      })
      .compile();
    // ... existing setup ...
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

  // ... existing ITs ...
  afterAll(async () => {
    await app.close();
  });

  it('/api/notes (POST)', () => {
    const createNoteDto = {
      encapsulatedKey: 'key',
      encryptedSymmetricKey: 'symkey',
      encryptedContent: 'content',
      recordHash: 'hash',
    };

    return request
      .agent(app.getHttpServer())
      .post('/api/notes')
      .send(createNoteDto)
      .expect(201)
      .expect((res) => {
        expect(res.body).toHaveProperty('encapsulatedKey', 'key');
        // expect(mockGridFsService.uploadBuffer).toHaveBeenCalled();
      });
  });

  it('/api/notes (GET)', () => {
    return request
      .agent(app.getHttpServer())
      .get('/api/notes')
      .expect(200)
      .expect((res) => {
        expect(Array.isArray(res.body)).toBe(true);
      });
  });

  it('/api/notes/:id (GET)', () => {
    return request
      .agent(app.getHttpServer())
      .get(`/api/notes/${mockNote._id}`)
      .expect(200);
  });

  it('/api/notes/:id/content (PUT)', () => {
    return request
      .agent(app.getHttpServer())
      .put(`/api/notes/${mockNote._id}/content`)
      .send({
        encapsulatedKey: 'newkey',
        encryptedSymmetricKey: 'newsym',
        encryptedContent: 'newcontent',
        recordHash: 'newhash',
      })
      .expect(200);
  });

  it('/api/notes/:id (DELETE)', () => {
    return request
      .agent(app.getHttpServer())
      .delete(`/api/notes/${mockNote._id}`)
      .expect(200);
  });
});
