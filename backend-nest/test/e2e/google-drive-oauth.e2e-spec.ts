import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ExecutionContext } from '@nestjs/common';

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

import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { JwtAuthGuard } from '../../src/modules/auth/guards/jwt-auth.guard';
import { Types } from 'mongoose';

// Mock googleapis
jest.mock('googleapis', () => {
  return {
    google: {
      auth: {
        OAuth2: jest.fn().mockImplementation(() => {
          return {
            generateAuthUrl: jest
              .fn()
              .mockReturnValue('https://mock-google-auth-url.com'),
            getToken: jest.fn().mockResolvedValue({
              tokens: {
                access_token: 'mock-access-token',
                refresh_token: 'mock-refresh-token',
                expiry_date: 123456789,
              },
            }),
            setCredentials: jest.fn(),
          };
        }),
      },
      drive: jest.fn().mockReturnValue({}),
    },
  };
});

describe('GoogleDriveController (E2E)', () => {
  let app: NestFastifyApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate: (context: ExecutionContext) => {
          const req = context.switchToHttp().getRequest();
          req.user = {
            userId: new Types.ObjectId().toString(),
            email: 'admin@example.com',
          };
          return true;
        },
      })
      .compile();

    app = moduleFixture.createNestApplication<NestFastifyApplication>(
      new FastifyAdapter(),
    );

    await app.init();
    await app.getHttpAdapter().getInstance().ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it('/vault/google/auth-url (GET) - should return auth URL', async () => {
    return request(app.getHttpServer())
      .get('/vault/google/auth-url')
      .expect(200)
      .expect((res) => {
        expect(res.body.url).toBe('https://mock-google-auth-url.com');
      });
  });

  it('/vault/google/callback (GET) - should handle code swap', async () => {
    return request(app.getHttpServer())
      .get('/vault/google/callback')
      .query({ code: 'mock-code' })
      .expect(200)
      .expect((res) => {
        expect(res.body.message).toBe('Authorization successful');
        expect(res.body.hasRefreshToken).toBe(true);
      });
  });

  it('/vault/google/callback (GET) - should handle missing code', async () => {
    return request(app.getHttpServer())
      .get('/vault/google/callback')
      .expect(200)
      .expect((res) => {
        expect(res.body.error).toBe('No code provided');
      });
  });
});
