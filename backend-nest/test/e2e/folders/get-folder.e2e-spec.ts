import { Test, TestingModule } from '@nestjs/testing';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { ValidationPipe } from '@nestjs/common';
import fastifyCookie from '@fastify/cookie';
import * as argon2 from 'argon2';
import { Types } from 'mongoose';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import { AppModule } from '../../../src/app.module';
import { UserRepository } from '../../../src/modules/auth/repositories/user.repository';
import { FolderRepository } from '../../../src/modules/folders/repositories/folder.repository';
import {
  Folder,
  FolderDocument,
} from '../../../src/modules/folders/schemas/folder.schema';

describe('Folders (e2e) - GET /api/folders/:id', () => {
  let app: NestFastifyApplication;
  let userRepository: UserRepository;
  let folderRepository: FolderRepository;
  let folderModel: Model<FolderDocument>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication<NestFastifyApplication>(
      new FastifyAdapter(),
    );

    await app.register(fastifyCookie, {
      secret: 'test-secret',
    });

    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
      }),
    );

    await app.init();
    await app.getHttpAdapter().getInstance().ready();

    userRepository = moduleFixture.get<UserRepository>(UserRepository);
    folderRepository = moduleFixture.get<FolderRepository>(FolderRepository);
    folderModel = moduleFixture.get<Model<FolderDocument>>(
      getModelToken(Folder.name, 'primary'),
    );
  });

  afterAll(async () => {
    await app.close();
  });

  const testPasswordRaw = 'password123';
  const testUser = {
    username: 'folders_get_single_test',
    email: 'folders_get_single_test@example.com',
  };
  let userId: string;
  let tokenCookie: string | undefined;

  beforeAll(async () => {
    // Cleanup and create user
    await userRepository.deleteMany({ email: testUser.email });
    const user = await userRepository.create({
      username: testUser.username,
      email: testUser.email,
      passwordHash: await argon2.hash(testPasswordRaw),
      passwordHashVersion: 2,
      pqcPublicKey: 'test-pqc-key',
    });
    userId = user._id.toString();

    // Login to get token
    const loginResponse = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: {
        email: testUser.email,
        argon2Hash: testPasswordRaw,
      },
    });
    const cookies: string[] = [].concat(
      loginResponse.headers['set-cookie'] as any,
    );
    tokenCookie = cookies.find((c) => c.startsWith('token='));
  });

  beforeEach(async () => {
    // Cleanup folders
    await folderModel.deleteMany({ ownerId: new Types.ObjectId(userId) });
  });

  it('should return a folder by ID with correct structure', async () => {
    const folder = await folderModel.create({
      ownerId: new Types.ObjectId(userId),
      name: 'Test Folder',
      parentId: null as any,
      encryptedSessionKey: 'mock-key-1',
      isShared: false,
    } as any);

    const response = await app.inject({
      method: 'GET',
      url: `/api/folders/${folder._id.toString()}`,
      headers: { cookie: tokenCookie },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.payload);
    expect(body._id.toString()).toBe(folder._id.toString());
    expect(body.name).toBe('Test Folder');
    expect(body.encryptedSessionKey).toBe('mock-key-1');
    expect(body.path).toEqual([]);
  });

  it('should return folder with path when nested', async () => {
    // Create parent folder
    const parentFolder = await folderModel.create({
      ownerId: new Types.ObjectId(userId),
      name: 'Parent Folder',
      parentId: null as any,
      encryptedSessionKey: 'mock-key-parent',
      isShared: false,
    } as any);

    // Create child folder
    const childFolder = await folderModel.create({
      ownerId: new Types.ObjectId(userId),
      name: 'Child Folder',
      parentId: parentFolder._id,
      encryptedSessionKey: 'mock-key-child',
      isShared: false,
    } as any);

    const response = await app.inject({
      method: 'GET',
      url: `/api/folders/${childFolder._id.toString()}`,
      headers: { cookie: tokenCookie },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.payload);
    expect(body._id.toString()).toBe(childFolder._id.toString());
    expect(body.name).toBe('Child Folder');
    expect(body.path).toHaveLength(1);
    expect(body.path[0]._id.toString()).toBe(parentFolder._id.toString());
    expect(body.path[0].name).toBe('Parent Folder');
  });

  it('should return folder with deep path when deeply nested', async () => {
    // Create grandparent -> parent -> child structure
    const grandparentFolder = await folderModel.create({
      ownerId: new Types.ObjectId(userId),
      name: 'Grandparent Folder',
      parentId: null as any,
      encryptedSessionKey: 'mock-key-gp',
      isShared: false,
    } as any);

    const parentFolder = await folderModel.create({
      ownerId: new Types.ObjectId(userId),
      name: 'Parent Folder',
      parentId: grandparentFolder._id,
      encryptedSessionKey: 'mock-key-parent',
      isShared: false,
    } as any);

    const childFolder = await folderModel.create({
      ownerId: new Types.ObjectId(userId),
      name: 'Child Folder',
      parentId: parentFolder._id,
      encryptedSessionKey: 'mock-key-child',
      isShared: false,
    } as any);

    const response = await app.inject({
      method: 'GET',
      url: `/api/folders/${childFolder._id.toString()}`,
      headers: { cookie: tokenCookie },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.payload);
    expect(body.path).toHaveLength(2);
    expect(body.path[0].name).toBe('Grandparent Folder');
    expect(body.path[1].name).toBe('Parent Folder');
  });

  it('should return 400 for invalid folder ID format', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/folders/invalid-id',
      headers: { cookie: tokenCookie },
    });

    expect(response.statusCode).toBe(400);
    const body = JSON.parse(response.payload);
    expect(body.message).toContain('Invalid folder ID');
  });

  it('should return 404 when folder does not exist', async () => {
    const fakeId = new Types.ObjectId().toString();
    const response = await app.inject({
      method: 'GET',
      url: `/api/folders/${fakeId}`,
      headers: { cookie: tokenCookie },
    });

    expect(response.statusCode).toBe(404);
    const body = JSON.parse(response.payload);
    expect(body.message).toContain('Folder not found or access denied');
  });

  it('should return 404 when accessing another user folder', async () => {
    // Create another user and their folder
    const otherUserEmail = 'other_folder_single@example.com';
    await userRepository.deleteMany({ email: otherUserEmail });

    const otherUser = await userRepository.create({
      username: 'other_folder_single_user',
      email: otherUserEmail,
      passwordHash: await argon2.hash(testPasswordRaw),
      passwordHashVersion: 2,
      pqcPublicKey: 'test-pqc-key-other',
    });

    const otherUserFolder = await folderModel.create({
      ownerId: otherUser._id,
      name: 'Other User Folder',
      parentId: null as any,
      encryptedSessionKey: 'mock-key-other',
      isShared: false,
    } as any);

    const response = await app.inject({
      method: 'GET',
      url: `/api/folders/${otherUserFolder._id.toString()}`,
      headers: { cookie: tokenCookie },
    });

    expect(response.statusCode).toBe(404);
    const body = JSON.parse(response.payload);
    expect(body.message).toContain('Folder not found or access denied');

    // Cleanup
    await userRepository.deleteById(otherUser._id.toString());
    await folderModel.deleteOne({ _id: otherUserFolder._id });
  });

  it('should return 401 when not authenticated', async () => {
    const fakeId = new Types.ObjectId().toString();
    const response = await app.inject({
      method: 'GET',
      url: `/api/folders/${fakeId}`,
    });

    expect(response.statusCode).toBe(401);
  });
});
