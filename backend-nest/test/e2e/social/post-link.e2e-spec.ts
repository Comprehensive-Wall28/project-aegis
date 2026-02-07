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
import { RoomRepository } from '../../../src/modules/social/repositories/room.repository';
import { CollectionRepository } from '../../../src/modules/social/repositories/collection.repository';
import { LinkPostRepository } from '../../../src/modules/social/repositories/link-post.repository';
import {
  Room,
  RoomDocument,
} from '../../../src/modules/social/schemas/room.schema';
import {
  Collection,
  CollectionDocument,
} from '../../../src/modules/social/schemas/collection.schema';
import {
  LinkPost,
  LinkPostDocument,
} from '../../../src/modules/social/schemas/link-post.schema';

describe('Social (e2e) - POST /api/social/rooms/:roomId/links', () => {
  let app: NestFastifyApplication;
  let userRepository: UserRepository;
  let roomRepository: RoomRepository;
  let collectionRepository: CollectionRepository;
  let linkPostRepository: LinkPostRepository;

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
    roomRepository = moduleFixture.get<RoomRepository>(RoomRepository);
    collectionRepository =
      moduleFixture.get<CollectionRepository>(CollectionRepository);
    linkPostRepository =
      moduleFixture.get<LinkPostRepository>(LinkPostRepository);
  }, 30000);

  afterAll(async () => {
    await app.close();
  });

  const testPasswordRaw = 'password123';
  const testUser = {
    username: 'post_link_test',
    email: 'post_link_test@example.com',
  };
  let userId: string;
  let tokenCookie: string | undefined;
  let roomId: string;
  let defaultCollectionId: string;
  let customCollectionId: string;

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

    const room = await roomRepository.create({
      name: 'Test Room',
      description: '',
      icon: '',
      members: [
        {
          userId: new Types.ObjectId(userId),
          role: 'owner',
          encryptedRoomKey: 'test-encrypted-key',
        },
      ],
    } as any);
    roomId = room._id.toString();

    const defaultCollection = await collectionRepository.create({
      roomId: room._id,
      name: '',
      order: 0,
      type: 'links',
    } as any);
    defaultCollectionId = defaultCollection._id.toString();

    const customCollection = await collectionRepository.create({
      roomId: room._id,
      name: 'Custom Collection',
      order: 1,
      type: 'links',
    } as any);
    customCollectionId = customCollection._id.toString();
  });

  beforeEach(async () => {
    await linkPostRepository.deleteByCollection(defaultCollectionId);
    await linkPostRepository.deleteByCollection(customCollectionId);
  });

  it('should post a link to default collection when no collectionId specified', async () => {
    const response = await app.inject({
      method: 'POST',
      url: `/api/social/rooms/${roomId}/links`,
      headers: { cookie: tokenCookie },
      payload: {
        url: 'https://example.com/test-link',
      },
    });

    expect(response.statusCode).toBe(201);
    const body = JSON.parse(response.payload);
    expect(body._id).toBeDefined();
    expect(body.url).toBe('https://example.com/test-link');
    expect(body.collectionId.toString()).toBe(defaultCollectionId);
    expect(body.previewData).toBeDefined();
    expect(body.previewData.scrapeStatus).toBe('scraping');
    expect(body.userId).toBeDefined();
    expect(body.userId.username).toBe(testUser.username);
  });

  it('should post a link to specified collection', async () => {
    const response = await app.inject({
      method: 'POST',
      url: `/api/social/rooms/${roomId}/links`,
      headers: { cookie: tokenCookie },
      payload: {
        url: 'https://example.com/custom-link',
        collectionId: customCollectionId,
      },
    });

    expect(response.statusCode).toBe(201);
    const body = JSON.parse(response.payload);
    expect(body.collectionId.toString()).toBe(customCollectionId);
    expect(body.url).toBe('https://example.com/custom-link');
  });

  it('should prepend https:// to URLs without protocol', async () => {
    const response = await app.inject({
      method: 'POST',
      url: `/api/social/rooms/${roomId}/links`,
      headers: { cookie: tokenCookie },
      payload: {
        url: 'example.com/no-protocol',
      },
    });

    expect(response.statusCode).toBe(201);
    const body = JSON.parse(response.payload);
    expect(body.url).toBe('https://example.com/no-protocol');
  });

  it('should return 400 when URL is missing', async () => {
    const response = await app.inject({
      method: 'POST',
      url: `/api/social/rooms/${roomId}/links`,
      headers: { cookie: tokenCookie },
      payload: {},
    });

    expect(response.statusCode).toBe(400);
  });

  it('should return 400 when duplicate link exists in collection', async () => {
    await app.inject({
      method: 'POST',
      url: `/api/social/rooms/${roomId}/links`,
      headers: { cookie: tokenCookie },
      payload: {
        url: 'https://duplicate.com',
      },
    });

    const response = await app.inject({
      method: 'POST',
      url: `/api/social/rooms/${roomId}/links`,
      headers: { cookie: tokenCookie },
      payload: {
        url: 'https://duplicate.com',
      },
    });

    expect(response.statusCode).toBe(400);
    const body = JSON.parse(response.payload);
    expect(body.message).toContain('already exists');
  });

  it('should allow same URL in different collections', async () => {
    const response1 = await app.inject({
      method: 'POST',
      url: `/api/social/rooms/${roomId}/links`,
      headers: { cookie: tokenCookie },
      payload: {
        url: 'https://same-url-different-collection.com',
      },
    });
    expect(response1.statusCode).toBe(201);

    const response2 = await app.inject({
      method: 'POST',
      url: `/api/social/rooms/${roomId}/links`,
      headers: { cookie: tokenCookie },
      payload: {
        url: 'https://same-url-different-collection.com',
        collectionId: customCollectionId,
      },
    });
    expect(response2.statusCode).toBe(201);
  });

  it('should return 404 when room does not exist', async () => {
    const fakeRoomId = new Types.ObjectId().toString();
    const response = await app.inject({
      method: 'POST',
      url: `/api/social/rooms/${fakeRoomId}/links`,
      headers: { cookie: tokenCookie },
      payload: {
        url: 'https://example.com',
      },
    });

    expect(response.statusCode).toBe(404);
  });

  it('should return 404 when collection does not exist', async () => {
    const fakeCollectionId = new Types.ObjectId().toString();
    const response = await app.inject({
      method: 'POST',
      url: `/api/social/rooms/${roomId}/links`,
      headers: { cookie: tokenCookie },
      payload: {
        url: 'https://example.com',
        collectionId: fakeCollectionId,
      },
    });

    expect(response.statusCode).toBe(404);
  });

  it('should return 404 when not a member of room', async () => {
    const otherEmail = 'other_post_link_test@example.com';
    const otherUsername = 'other_post_link_user';
    await userRepository.deleteMany({ email: otherEmail });
    await userRepository.deleteMany({ username: otherUsername });

    await userRepository.create({
      username: otherUsername,
      email: otherEmail,
      passwordHash: await argon2.hash(testPasswordRaw),
      passwordHashVersion: 2,
      pqcPublicKey: 'test-pqc-key',
    });

    const loginResponse = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: {
        email: otherEmail,
        argon2Hash: testPasswordRaw,
      },
    });
    const cookies: string[] = [].concat(
      loginResponse.headers['set-cookie'] as any,
    );
    const otherTokenCookie = cookies.find((c) => c.startsWith('token='));

    const response = await app.inject({
      method: 'POST',
      url: `/api/social/rooms/${roomId}/links`,
      headers: { cookie: otherTokenCookie },
      payload: {
        url: 'https://example.com',
      },
    });

    expect(response.statusCode).toBe(404);
  });

  it('should return 401 when not authenticated', async () => {
    const response = await app.inject({
      method: 'POST',
      url: `/api/social/rooms/${roomId}/links`,
      payload: {
        url: 'https://example.com',
      },
    });

    expect(response.statusCode).toBe(401);
  });

  it('should set placeholder preview data with scraping status', async () => {
    const response = await app.inject({
      method: 'POST',
      url: `/api/social/rooms/${roomId}/links`,
      headers: { cookie: tokenCookie },
      payload: {
        url: 'https://preview-test.com/page',
      },
    });

    expect(response.statusCode).toBe(201);
    const body = JSON.parse(response.payload);
    expect(body.previewData).toBeDefined();
    expect(body.previewData.title).toBe('preview-test.com/page');
    expect(body.previewData.scrapeStatus).toBe('scraping');
  });
});
