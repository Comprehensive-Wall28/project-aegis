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
import { VaultRepository } from '../../../src/modules/vault/repositories/vault.repository';
import {
  Folder,
  FolderDocument,
} from '../../../src/modules/folders/schemas/folder.schema';
import {
  FileMetadata,
  FileMetadataDocument,
} from '../../../src/modules/vault/schemas/file-metadata.schema';

describe('Folders (e2e) - DELETE /api/folders/:id', () => {
  let app: NestFastifyApplication;
  let userRepository: UserRepository;
  let folderRepository: FolderRepository;
  let vaultRepository: VaultRepository;
  let folderModel: Model<FolderDocument>;
  let fileMetadataModel: Model<FileMetadataDocument>;

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
    vaultRepository = moduleFixture.get<VaultRepository>(VaultRepository);
    folderModel = moduleFixture.get<Model<FolderDocument>>(
      getModelToken(Folder.name, 'primary'),
    );
    fileMetadataModel = moduleFixture.get<Model<FileMetadataDocument>>(
      getModelToken(FileMetadata.name, 'primary'),
    );
  });

  afterAll(async () => {
    await app.close();
  });

  const testPasswordRaw = 'password123';
  const testUser = {
    username: 'delete_folder_test',
    email: 'delete_folder_test@example.com',
  };
  const otherUser = {
    username: 'other_delete_user',
    email: 'other_delete_user@example.com',
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
    // Cleanup folders and files
    await folderModel.deleteMany({
      ownerId: {
        $in: [new Types.ObjectId(userId), new Types.ObjectId(otherUserId)],
      },
    });
    await fileMetadataModel.deleteMany({
      ownerId: {
        $in: [new Types.ObjectId(userId), new Types.ObjectId(otherUserId)],
      },
    });
  });

  it('should delete an empty folder', async () => {
    // Create a folder first
    const folder = (await folderModel.create({
      ownerId: new Types.ObjectId(userId),
      name: 'Folder to Delete',
      parentId: null as any,
      encryptedSessionKey: 'mock-session-key',
      isShared: false,
    } as any)) as any;

    const response = await app.inject({
      method: 'DELETE',
      url: `/api/folders/${folder._id.toString()}`,
      headers: {
        cookie: tokenCookie,
      },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.payload);
    expect(body.message).toBe('Folder deleted successfully');

    // Verify folder was deleted
    const deletedFolder = await folderModel.findById(folder._id);
    expect(deletedFolder).toBeNull();
  });

  it('should return 400 when folder has files', async () => {
    // Create a folder
    const folder = (await folderModel.create({
      ownerId: new Types.ObjectId(userId),
      name: 'Folder with Files',
      parentId: null as any,
      encryptedSessionKey: 'mock-session-key',
      isShared: false,
    } as any)) as any;

    // Create a file in the folder
    await fileMetadataModel.create({
      ownerId: new Types.ObjectId(userId),
      folderId: folder._id,
      fileName: 'test.txt',
      originalFileName: 'test.txt',
      fileSize: 100,
      encapsulatedKey: 'test-key',
      encryptedSymmetricKey: 'test-symmetric-key',
      mimeType: 'text/plain',
      status: 'completed',
    } as any);

    const response = await app.inject({
      method: 'DELETE',
      url: `/api/folders/${folder._id.toString()}`,
      headers: {
        cookie: tokenCookie,
      },
    });

    expect(response.statusCode).toBe(400);
    const body = JSON.parse(response.payload);
    expect(body.message).toBe(
      'Cannot delete folder with files. Move or delete files first.',
    );

    // Verify folder still exists
    const existingFolder = await folderModel.findById(folder._id);
    expect(existingFolder).not.toBeNull();
  });

  it('should return 400 when folder has subfolders', async () => {
    // Create parent folder
    const parentFolder = (await folderModel.create({
      ownerId: new Types.ObjectId(userId),
      name: 'Parent Folder',
      parentId: null as any,
      encryptedSessionKey: 'mock-session-key',
      isShared: false,
    } as any)) as any;

    // Create subfolder
    await folderModel.create({
      ownerId: new Types.ObjectId(userId),
      name: 'Subfolder',
      parentId: parentFolder._id,
      encryptedSessionKey: 'mock-session-key',
      isShared: false,
    } as any);

    const response = await app.inject({
      method: 'DELETE',
      url: `/api/folders/${parentFolder._id.toString()}`,
      headers: {
        cookie: tokenCookie,
      },
    });

    expect(response.statusCode).toBe(400);
    const body = JSON.parse(response.payload);
    expect(body.message).toBe(
      'Cannot delete folder with subfolders. Delete subfolders first.',
    );

    // Verify parent folder still exists
    const existingFolder = await folderModel.findById(parentFolder._id);
    expect(existingFolder).not.toBeNull();
  });

  it('should return 400 for invalid folder ID format', async () => {
    const response = await app.inject({
      method: 'DELETE',
      url: '/api/folders/invalid-id',
      headers: {
        cookie: tokenCookie,
      },
    });

    expect(response.statusCode).toBe(400);
    const body = JSON.parse(response.payload);
    expect(body.message).toBe('Invalid folder ID');
  });

  it('should return 404 when folder not found', async () => {
    const fakeId = new Types.ObjectId().toString();

    const response = await app.inject({
      method: 'DELETE',
      url: `/api/folders/${fakeId}`,
      headers: {
        cookie: tokenCookie,
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
      method: 'DELETE',
      url: `/api/folders/${otherFolder._id.toString()}`,
      headers: {
        cookie: tokenCookie,
      },
    });

    expect(response.statusCode).toBe(404);
    const body = JSON.parse(response.payload);
    expect(body.message).toBe('Folder not found');

    // Verify other user's folder still exists
    const existingFolder = await folderModel.findById(otherFolder._id);
    expect(existingFolder).not.toBeNull();
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
      method: 'DELETE',
      url: `/api/folders/${folder._id.toString()}`,
    });

    expect(response.statusCode).toBe(401);
  });
});
