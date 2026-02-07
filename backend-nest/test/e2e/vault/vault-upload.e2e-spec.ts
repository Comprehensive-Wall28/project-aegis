import { Test, TestingModule } from '@nestjs/testing';
import { ValidationPipe } from '@nestjs/common';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import fastifyCookie from '@fastify/cookie';
import * as argon2 from 'argon2';
import { AppModule } from '../../../src/app.module';
import { GoogleDriveService } from '../../../src/modules/vault/services/google-drive.service';
import { UserRepository } from '../../../src/modules/auth/repositories/user.repository';

describe('VaultModule (e2e) - POST /api/vault/upload-init', () => {
  let app: NestFastifyApplication;
  let userRepository: UserRepository;
  let tokenCookie: string;
  let testUserId: string;

  const testUser = {
    username: 'vault_test_user',
    email: 'vault_test@example.com',
    password: 'password123',
    pqcPublicKey: 'mock_pqc_key',
  };

  const mockGoogleDriveService = {
    initiateUpload: jest.fn().mockResolvedValue({
      sessionId: 'test-session-id',
      sessionUrl: 'https://test-session-url.com',
    }),
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(GoogleDriveService)
      .useValue(mockGoogleDriveService)
      .compile();

    app = moduleFixture.createNestApplication<NestFastifyApplication>(
      new FastifyAdapter(),
    );

    await app.register(fastifyCookie, {
      secret: 'test-api-secret-2024-secure-and-long',
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
  });

  afterAll(async () => {
    if (userRepository) {
      await userRepository.deleteMany({ email: testUser.email });
    }
    if (app) {
      await app.close();
    }
  });

  beforeEach(async () => {
    await userRepository.deleteMany({ email: testUser.email });

    // Create test user
    const passwordHash = await argon2.hash(testUser.password);
    const user = await userRepository.create({
      username: testUser.username,
      email: testUser.email,
      passwordHash,
      pqcPublicKey: testUser.pqcPublicKey,
      passwordHashVersion: 2,
    });
    testUserId = user._id.toString();

    // Login to get token
    const loginResponse = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: {
        email: testUser.email,
        argon2Hash: testUser.password,
      },
    });

    const cookies: string[] = [].concat(
      loginResponse.headers['set-cookie'] as any,
    );
    tokenCookie = cookies.find((c) => c.startsWith('token=')) || '';
  });

  const uploadData = {
    fileName: 'encrypted-file.dat',
    originalFileName: 'test.png',
    fileSize: 1024,
    encryptedSymmetricKey: 'some-key',
    encapsulatedKey: 'some-encapsulated-key',
    mimeType: 'image/png',
  };

  it('should successfully initialize upload', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/vault/upload-init',
      headers: {
        cookie: tokenCookie,
      },
      payload: uploadData,
    });

    expect(response.statusCode).toBe(201);
    const body = JSON.parse(response.body);
    expect(body).toHaveProperty('fileId');
    expect(typeof body.fileId).toBe('string');

    expect(mockGoogleDriveService.initiateUpload).toHaveBeenCalledWith(
      uploadData.originalFileName,
      uploadData.fileSize,
      { ownerId: testUserId },
    );
  });

  it('should fail if unauthorized', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/vault/upload-init',
      payload: uploadData,
    });

    expect(response.statusCode).toBe(401);
  });

  it('should fail if storage limit exceeded', async () => {
    // Set user storage used to just below limit
    const MAX_STORAGE = 5 * 1024 * 1024 * 1024;
    await userRepository.updateById(testUserId, {
      totalStorageUsed: MAX_STORAGE - 500,
    } as any);

    const response = await app.inject({
      method: 'POST',
      url: '/api/vault/upload-init',
      headers: {
        cookie: tokenCookie,
      },
      payload: {
        ...uploadData,
        fileSize: 1024, // 1024 + (MAX - 500) > MAX
      },
    });

    expect(response.statusCode).toBe(403);
    const body = JSON.parse(response.body);
    expect(body.message).toContain('Storage limit exceeded');
  });

  it('should fail if required fields are missing', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/vault/upload-init',
      headers: {
        cookie: tokenCookie,
      },
      payload: {
        fileName: 'test.dat',
        // missing other fields
      },
    });

    expect(response.statusCode).toBe(400);
  });
});
