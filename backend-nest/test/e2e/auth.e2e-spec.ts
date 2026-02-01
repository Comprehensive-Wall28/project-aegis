import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';

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

import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { getModelToken } from '@nestjs/mongoose';
import { User } from '../../src/modules/users/schemas/user.schema';
import { Types } from 'mongoose';
import * as argon2 from 'argon2';

describe('AuthController (E2E)', () => {
  let app: NestFastifyApplication;
  let validHash: string;
  const testPassword = 'password123';

  // Mock user data
  const mockUser = {
    _id: new Types.ObjectId(),
    username: 'testuser',
    email: 'test@example.com',
    pqcPublicKey: 'mock-pqc-key',
    passwordHashVersion: 2,
    preferences: {},
    isEmailVerified: false,
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

  const mockUserModel = {
    create: jest.fn().mockImplementation((dto) => {
      return {
        ...dto,
        _id: new Types.ObjectId(),
        save: jest.fn().mockResolvedValue(true),
        toObject: jest.fn().mockReturnThis(),
      };
    }),
    findByEmail: jest.fn(), // If UsersService uses this directly? No, it uses Repo.
    // Repository calls model.findOne, model.findById, etc.
    findOne: jest.fn().mockImplementation((filter) => {
      const { email, username, _id } = filter || {};
      if (
        email === mockUser.email ||
        username === mockUser.username ||
        (_id && _id.toString() === mockUser._id.toString())
      ) {
        return createMockQuery({
          ...mockUser,
          passwordHash: validHash,
        });
      }
      return createMockQuery(null);
    }),
    findById: jest.fn().mockImplementation((id) => {
      if (id.toString() === mockUser._id.toString()) {
        return createMockQuery({
          ...mockUser,
          passwordHash: validHash,
        });
      }
      return createMockQuery(null);
    }),
    exists: jest.fn().mockImplementation(() => createMockQuery(null)), // For isEmailTaken check in Register
  };

  beforeAll(async () => {
    // Pre-calculate hash
    validHash = await argon2.hash(testPassword);

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(getModelToken(User.name))
      .useValue(mockUserModel)
      .compile();

    app = moduleFixture.createNestApplication<NestFastifyApplication>(
      new FastifyAdapter(),
    );
    app.setGlobalPrefix('api');
    await app.register(require('@fastify/cookie'), {
      secret: 'my-secret', // for signCookie
    });

    // Setup pipes as in main.ts
    // app.useGlobalPipes(new ValidationPipe({...}));
    // Actually AppModule might not have them globallly unless configured in main.ts
    // But Controller validation relies on ValidationPipe.
    // E2E usually uses the same setup as main.ts
    // For simplicity let's assume AppModule or the test setup here needs to match main.ts minimal config
    // "app.e2e-spec.ts" had app.setGlobalPrefix('api');

    await app.init();
    await app.getHttpAdapter().getInstance().ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it('/api/auth/register (POST)', async () => {
    const registerDto = {
      username: 'newuser',
      email: 'new@example.com',
      pqcPublicKey: 'some-key',
      argon2Hash: testPassword,
    };

    return request(app.getHttpServer())
      .post('/api/auth/register')
      .send(registerDto)
      .expect(201)
      .expect((res) => {
        expect(res.body).toHaveProperty('username', 'newuser');
        expect(res.headers['set-cookie']).toBeDefined();
      });
  });

  it('/api/auth/login (POST)', async () => {
    const loginDto = {
      email: 'test@example.com',
      argon2Hash: testPassword,
    };

    return request(app.getHttpServer())
      .post('/api/auth/login')
      .send(loginDto)
      .expect(200)
      .expect((res) => {
        expect(res.body).toHaveProperty('username', 'testuser');
        expect(res.headers['set-cookie']).toBeDefined();
      });
  });

  it('/api/auth/me (GET) - unauthorized', () => {
    return request(app.getHttpServer()).get('/api/auth/me').expect(401);
  });

  it('/api/auth/me (GET) - authorized', async () => {
    // Login first to get cookie
    const loginDto = {
      email: 'test@example.com',
      argon2Hash: testPassword,
    };

    const loginRes = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send(loginDto)
      .expect(200);

    const cookie = loginRes.headers['set-cookie'];

    return request(app.getHttpServer())
      .get('/api/auth/me')
      .set('Cookie', cookie)
      .expect(200)
      .expect((res) => {
        expect(res.body).toHaveProperty('username', 'testuser');
      });
  });
});
