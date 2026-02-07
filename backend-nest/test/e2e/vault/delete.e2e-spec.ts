import { Test, TestingModule } from '@nestjs/testing';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { ValidationPipe } from '@nestjs/common';
import fastifyCookie from '@fastify/cookie';
import * as argon2 from 'argon2';
import { Types } from 'mongoose';

import { AppModule } from '../../../src/app.module';
import { UserRepository } from '../../../src/modules/auth/repositories/user.repository';
import { VaultRepository } from '../../../src/modules/vault/repositories/vault.repository';
import { GoogleDriveService } from '../../../src/modules/vault/services/google-drive.service';

describe('Vault deletion (e2e) - DELETE /api/vault/files/:id', () => {
  let app: NestFastifyApplication;
  let userRepository: UserRepository;
  let vaultRepository: VaultRepository;
  let googleDriveService: GoogleDriveService;

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
    vaultRepository = moduleFixture.get<VaultRepository>(VaultRepository);
    googleDriveService =
      moduleFixture.get<GoogleDriveService>(GoogleDriveService);
  });

  afterAll(async () => {
    await app.close();
  });

  const testPasswordRaw = 'password123';
  const testUser = {
    username: 'vault_delete_test',
    email: 'vault_delete@example.com',
  };
  let userId: string;
  let tokenCookie: string | undefined;

  beforeAll(async () => {
    await userRepository.deleteMany({ email: testUser.email });
    const user = await userRepository.create({
      username: testUser.username,
      email: testUser.email,
      passwordHash: await argon2.hash(testPasswordRaw),
      passwordHashVersion: 2,
      pqcPublicKey: 'test-pqc-key',
    });
    userId = user._id.toString();

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

  it('should delete an existing file', async () => {
    // Mock deleteFile
    jest.spyOn(googleDriveService, 'deleteFile').mockResolvedValue(undefined);

    const file = await vaultRepository.create({
      ownerId: new Types.ObjectId(userId),
      fileName: 'delete_me.enc',
      originalFileName: 'delete_me.txt',
      fileSize: 100,
      mimeType: 'text/plain',
      status: 'completed',
      encryptedSymmetricKey: 'mock-key',
      encapsulatedKey: 'mock-encapsulated',
      googleDriveFileId: 'mock-drive-id',
    } as any);

    const response = await app.inject({
      method: 'DELETE',
      url: `/api/vault/files/${file._id}`,
      headers: { cookie: tokenCookie },
    });

    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.payload).message).toBe(
      'File deleted successfully',
    );

    const deletedFile = await vaultRepository.findById(file._id.toString());
    expect(deletedFile).toBeNull();
  });

  it('should return 404 for non-existent file', async () => {
    const fakeId = new Types.ObjectId();
    const response = await app.inject({
      method: 'DELETE',
      url: `/api/vault/files/${fakeId}`,
      headers: { cookie: tokenCookie },
    });

    expect(response.statusCode).toBe(404);
  });

  it('should return 404/403 for file owned by another user', async () => {
    const otherEmail = 'other_vault_delete@example.com';
    await userRepository.deleteMany({ email: otherEmail });
    const otherUser = await userRepository.create({
      username: 'other_vault_delete_user',
      email: otherEmail,
      passwordHash: 'hash',
      pqcPublicKey: 'key',
    });

    const file = await vaultRepository.create({
      ownerId: otherUser._id,
      fileName: 'other_file.enc',
      originalFileName: 'other_file.txt',
      fileSize: 100,
      mimeType: 'text/plain',
      status: 'completed',
      encryptedSymmetricKey: 'mock-key',
      encapsulatedKey: 'mock-encapsulated',
    } as any);

    const response = await app.inject({
      method: 'DELETE',
      url: `/api/vault/files/${file._id}`,
      headers: { cookie: tokenCookie },
    });

    expect(response.statusCode).toBe(404); // Our implementation throws NotFound if findByIdAndOwner fails
  });
});
