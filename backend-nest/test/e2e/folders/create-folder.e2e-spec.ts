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

describe('Folders (e2e) - POST /api/folders', () => {
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
    username: 'create_folder_test',
    email: 'create_folder_test@example.com',
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

  it('should create a folder at root level', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/folders',
      headers: {
        cookie: tokenCookie,
      },
      payload: {
        name: 'Test Folder',
        encryptedSessionKey: 'mock-session-key',
      },
    });

    expect(response.statusCode).toBe(201);
    const body = JSON.parse(response.payload);
    expect(body.name).toBe('Test Folder');
    expect(body.encryptedSessionKey).toBe('mock-session-key');
    expect(body.parentId).toBeNull();
    expect(body.ownerId.toString()).toBe(userId);
    expect(body._id).toBeDefined();
    expect(body.createdAt).toBeDefined();
    expect(body.updatedAt).toBeDefined();
  });

  it('should create a subfolder with parentId', async () => {
    // Create parent folder first
    const parentFolder = (await folderModel.create({
      ownerId: new Types.ObjectId(userId),
      name: 'Parent Folder',
      parentId: null as any,
      encryptedSessionKey: 'mock-parent-key',
      isShared: false,
    } as any)) as any;

    const response = await app.inject({
      method: 'POST',
      url: '/api/folders',
      headers: {
        cookie: tokenCookie,
      },
      payload: {
        name: 'Subfolder',
        parentId: parentFolder._id.toString(),
        encryptedSessionKey: 'mock-sub-key',
      },
    });

    expect(response.statusCode).toBe(201);
    const body = JSON.parse(response.payload);
    expect(body.name).toBe('Subfolder');
    expect(body.parentId.toString()).toBe(parentFolder._id.toString());
  });

  it('should trim folder name', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/folders',
      headers: {
        cookie: tokenCookie,
      },
      payload: {
        name: '  Trimmed Folder  ',
        encryptedSessionKey: 'mock-session-key',
      },
    });

    expect(response.statusCode).toBe(201);
    const body = JSON.parse(response.payload);
    expect(body.name).toBe('Trimmed Folder');
  });

  it('should return 400 when name is missing', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/folders',
      headers: {
        cookie: tokenCookie,
      },
      payload: {
        encryptedSessionKey: 'mock-session-key',
      },
    });

    expect(response.statusCode).toBe(400);
    const body = JSON.parse(response.payload);
    expect(body.message).toEqual(
      expect.arrayContaining([expect.stringContaining('name')]),
    );
  });

  it('should return 400 when name is empty', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/folders',
      headers: {
        cookie: tokenCookie,
      },
      payload: {
        name: '',
        encryptedSessionKey: 'mock-session-key',
      },
    });

    expect(response.statusCode).toBe(400);
    const body = JSON.parse(response.payload);
    expect(body.message).toEqual(
      expect.arrayContaining([expect.stringContaining('name')]),
    );
  });

  it('should return 400 when encryptedSessionKey is missing', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/folders',
      headers: {
        cookie: tokenCookie,
      },
      payload: {
        name: 'Test Folder',
      },
    });

    expect(response.statusCode).toBe(400);
    const body = JSON.parse(response.payload);
    expect(body.message).toEqual(
      expect.arrayContaining([expect.stringContaining('encryptedSessionKey')]),
    );
  });

  it('should return 401 when not authenticated', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/folders',
      payload: {
        name: 'Test Folder',
        encryptedSessionKey: 'mock-session-key',
      },
    });

    expect(response.statusCode).toBe(401);
  });
});
