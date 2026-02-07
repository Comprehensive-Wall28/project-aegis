import { Test, TestingModule } from '@nestjs/testing';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { ValidationPipe } from '@nestjs/common';
import fastifyCookie from '@fastify/cookie';
import * as argon2 from 'argon2';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import { AppModule } from '../../../src/app.module';
import { UserRepository } from '../../../src/modules/auth/repositories/user.repository';
import {
  User,
  UserDocument,
} from '../../../src/modules/auth/schemas/user.schema';

describe('Vault Storage Stats (e2e) - GET /api/vault/storage-stats', () => {
  let app: NestFastifyApplication;
  let userRepository: UserRepository;
  let userModel: Model<UserDocument>;

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
    userModel = moduleFixture.get<Model<UserDocument>>(
      getModelToken(User.name, 'primary'),
    );
  });

  afterAll(async () => {
    await app.close();
  });

  const testPasswordRaw = 'password123';
  const testUser = {
    username: 'storage_stats_test',
    email: 'storage_stats@example.com',
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
      totalStorageUsed: 0,
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

  it('should return initial storage stats', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/vault/storage-stats',
      headers: { cookie: tokenCookie },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.payload);
    expect(body.totalStorageUsed).toBe(0);
    expect(body.maxStorage).toBe(5 * 1024 * 1024 * 1024);
  });

  it('should return updated storage stats after manual update', async () => {
    const mockUsedStorage = 1024 * 1024 * 100; // 100MB
    await userModel.findByIdAndUpdate(userId, {
      totalStorageUsed: mockUsedStorage,
    });

    const response = await app.inject({
      method: 'GET',
      url: '/api/vault/storage-stats',
      headers: { cookie: tokenCookie },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.payload);
    expect(body.totalStorageUsed).toBe(mockUsedStorage);
    expect(body.maxStorage).toBe(5 * 1024 * 1024 * 1024);
  });

  it('should fail when not authenticated', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/vault/storage-stats',
    });

    expect(response.statusCode).toBe(401);
  });
});
