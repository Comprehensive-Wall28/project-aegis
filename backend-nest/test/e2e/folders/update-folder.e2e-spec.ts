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

describe('Folders (e2e) - PUT /api/folders/:id', () => {
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
    username: 'update_folder_test',
    email: 'update_folder_test@example.com',
  };
  const otherUser = {
    username: 'other_folder_user',
    email: 'other_folder_user@example.com',
  };
  let userId: string;
  let otherUserId: string;
  let tokenCookie: string | undefined;
  let otherTokenCookie: string | undefined;

  beforeAll(async () => {
    // Cleanup users
    await userRepository.deleteMany({
      email: { $in: [testUser.email, otherUser.email] },
    });

    // Create test user
    const user = await userRepository.create({
      username: testUser.username,
      email: testUser.email,
      passwordHash: await argon2.hash(testPasswordRaw),
      passwordHashVersion: 2,
      pqcPublicKey: 'test-pqc-key',
    });
    userId = user._id.toString();

    // Create other user
    const other = await userRepository.create({
      username: otherUser.username,
      email: otherUser.email,
      passwordHash: await argon2.hash(testPasswordRaw),
      passwordHashVersion: 2,
      pqcPublicKey: 'test-pqc-key-2',
    });
    otherUserId = other._id.toString();

    // Login as test user
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

    // Login as other user
    const otherLoginResponse = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: {
        email: otherUser.email,
        argon2Hash: testPasswordRaw,
      },
    });
    const otherCookies: string[] = [].concat(
      otherLoginResponse.headers['set-cookie'] as any,
    );
    otherTokenCookie = otherCookies.find((c) => c.startsWith('token='));
  });

  beforeEach(async () => {
    // Cleanup folders
    await folderModel.deleteMany({
      ownerId: {
        $in: [new Types.ObjectId(userId), new Types.ObjectId(otherUserId)],
      },
    });
  });

  it('should rename a folder', async () => {
    // Create a folder first
    const folder = (await folderModel.create({
      ownerId: new Types.ObjectId(userId),
      name: 'Original Name',
      parentId: null as any,
      encryptedSessionKey: 'mock-session-key',
      isShared: false,
    } as any)) as any;

    const response = await app.inject({
      method: 'PUT',
      url: `/api/folders/${folder._id.toString()}`,
      headers: {
        cookie: tokenCookie,
      },
      payload: {
        name: 'Updated Name',
      },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.payload);
    expect(body.name).toBe('Updated Name');
    expect(body._id.toString()).toBe(folder._id.toString());
  });

  it('should change folder color', async () => {
    const folder = (await folderModel.create({
      ownerId: new Types.ObjectId(userId),
      name: 'Test Folder',
      parentId: null as any,
      encryptedSessionKey: 'mock-session-key',
      isShared: false,
      color: null,
    } as any)) as any;

    const response = await app.inject({
      method: 'PUT',
      url: `/api/folders/${folder._id.toString()}`,
      headers: {
        cookie: tokenCookie,
      },
      payload: {
        color: '#FF5733',
      },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.payload);
    expect(body.color).toBe('#FF5733');
  });

  it('should remove folder color when color is null', async () => {
    const folder = (await folderModel.create({
      ownerId: new Types.ObjectId(userId),
      name: 'Test Folder',
      parentId: null as any,
      encryptedSessionKey: 'mock-session-key',
      isShared: false,
      color: '#FF5733',
    } as any)) as any;

    const response = await app.inject({
      method: 'PUT',
      url: `/api/folders/${folder._id.toString()}`,
      headers: {
        cookie: tokenCookie,
      },
      payload: {
        color: null,
      },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.payload);
    expect(body.color).toBeNull();
  });

  it('should update both name and color', async () => {
    const folder = (await folderModel.create({
      ownerId: new Types.ObjectId(userId),
      name: 'Old Name',
      parentId: null as any,
      encryptedSessionKey: 'mock-session-key',
      isShared: false,
      color: null,
    } as any)) as any;

    const response = await app.inject({
      method: 'PUT',
      url: `/api/folders/${folder._id.toString()}`,
      headers: {
        cookie: tokenCookie,
      },
      payload: {
        name: 'New Name',
        color: '#00FF00',
      },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.payload);
    expect(body.name).toBe('New Name');
    expect(body.color).toBe('#00FF00');
  });

  it('should trim folder name', async () => {
    const folder = (await folderModel.create({
      ownerId: new Types.ObjectId(userId),
      name: 'Test Folder',
      parentId: null as any,
      encryptedSessionKey: 'mock-session-key',
      isShared: false,
    } as any)) as any;

    const response = await app.inject({
      method: 'PUT',
      url: `/api/folders/${folder._id.toString()}`,
      headers: {
        cookie: tokenCookie,
      },
      payload: {
        name: '  Trimmed Name  ',
      },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.payload);
    expect(body.name).toBe('Trimmed Name');
  });

  it('should return 400 when no valid fields to update', async () => {
    const folder = (await folderModel.create({
      ownerId: new Types.ObjectId(userId),
      name: 'Test Folder',
      parentId: null as any,
      encryptedSessionKey: 'mock-session-key',
      isShared: false,
    } as any)) as any;

    const response = await app.inject({
      method: 'PUT',
      url: `/api/folders/${folder._id.toString()}`,
      headers: {
        cookie: tokenCookie,
      },
      payload: {},
    });

    expect(response.statusCode).toBe(400);
    const body = JSON.parse(response.payload);
    expect(body.message).toBe('No valid fields to update');
  });

  it('should return 400 when name is empty', async () => {
    const folder = (await folderModel.create({
      ownerId: new Types.ObjectId(userId),
      name: 'Test Folder',
      parentId: null as any,
      encryptedSessionKey: 'mock-session-key',
      isShared: false,
    } as any)) as any;

    const response = await app.inject({
      method: 'PUT',
      url: `/api/folders/${folder._id.toString()}`,
      headers: {
        cookie: tokenCookie,
      },
      payload: {
        name: '',
      },
    });

    expect(response.statusCode).toBe(400);
    const body = JSON.parse(response.payload);
    expect(body.message).toBeInstanceOf(Array);
  });

  it('should return 400 for invalid folder ID format', async () => {
    const response = await app.inject({
      method: 'PUT',
      url: '/api/folders/invalid-id',
      headers: {
        cookie: tokenCookie,
      },
      payload: {
        name: 'New Name',
      },
    });

    expect(response.statusCode).toBe(400);
    const body = JSON.parse(response.payload);
    expect(body.message).toBe('Invalid folder ID');
  });

  it('should return 404 when folder not found', async () => {
    const fakeId = new Types.ObjectId().toString();

    const response = await app.inject({
      method: 'PUT',
      url: `/api/folders/${fakeId}`,
      headers: {
        cookie: tokenCookie,
      },
      payload: {
        name: 'New Name',
      },
    });

    expect(response.statusCode).toBe(404);
    const body = JSON.parse(response.payload);
    expect(body.message).toBe('Folder not found');
  });

  it('should return 404 when folder belongs to another user', async () => {
    // Create folder for other user
    const otherFolder = (await folderModel.create({
      ownerId: new Types.ObjectId(otherUserId),
      name: 'Other User Folder',
      parentId: null as any,
      encryptedSessionKey: 'mock-session-key',
      isShared: false,
    } as any)) as any;

    const response = await app.inject({
      method: 'PUT',
      url: `/api/folders/${otherFolder._id.toString()}`,
      headers: {
        cookie: tokenCookie,
      },
      payload: {
        name: 'New Name',
      },
    });

    expect(response.statusCode).toBe(404);
    const body = JSON.parse(response.payload);
    expect(body.message).toBe('Folder not found');
  });

  it('should return 401 when not authenticated', async () => {
    const folder = (await folderModel.create({
      ownerId: new Types.ObjectId(userId),
      name: 'Test Folder',
      parentId: null as any,
      encryptedSessionKey: 'mock-session-key',
      isShared: false,
    } as any)) as any;

    const response = await app.inject({
      method: 'PUT',
      url: `/api/folders/${folder._id.toString()}`,
      payload: {
        name: 'New Name',
      },
    });

    expect(response.statusCode).toBe(401);
  });
});
