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
import {
  Room,
  RoomDocument,
} from '../../../src/modules/social/schemas/room.schema';
import {
  Collection,
  CollectionDocument,
} from '../../../src/modules/social/schemas/collection.schema';

describe('Social (e2e) - POST /api/social/rooms/:roomId/collections', () => {
  let app: NestFastifyApplication;
  let userRepository: UserRepository;
  let roomRepository: RoomRepository;
  let collectionRepository: CollectionRepository;
  let roomModel: Model<RoomDocument>;
  let collectionModel: Model<CollectionDocument>;

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
    roomModel = moduleFixture.get<Model<RoomDocument>>(
      getModelToken(Room.name, 'primary'),
    );
    collectionModel = moduleFixture.get<Model<CollectionDocument>>(
      getModelToken(Collection.name, 'primary'),
    );
  });

  afterAll(async () => {
    await app.close();
  });

  const testPasswordRaw = 'password123';
  const testUser = {
    username: 'create_collection_test',
    email: 'create_collection_test@example.com',
  };
  let userId: string;
  let tokenCookie: string | undefined;
  let roomId: string;

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
  });

  beforeEach(async () => {
    const collections = await collectionRepository.findByRoom(roomId);
    for (const col of collections) {
      if (col.name !== '') {
        await collectionRepository.deleteById(col._id.toString());
      }
    }
  });

  it('should create a collection with name', async () => {
    const response = await app.inject({
      method: 'POST',
      url: `/api/social/rooms/${roomId}/collections`,
      headers: { cookie: tokenCookie },
      payload: {
        name: 'My Collection',
      },
    });

    expect(response.statusCode).toBe(201);
    const body = JSON.parse(response.payload);
    expect(body._id).toBeDefined();
    expect(body.name).toBe('My Collection');
    expect(body.roomId).toBe(roomId);
    expect(body.type).toBe('links');
    expect(body.order).toBe(1);
    expect(body.createdAt).toBeDefined();
    expect(body.updatedAt).toBeDefined();

    const collections = await collectionRepository.findByRoom(roomId);
    expect(collections.length).toBe(2);
    const newCollection = collections.find((c) => c.name === 'My Collection');
    expect(newCollection).toBeDefined();
  });

  it('should create a collection with discussion type', async () => {
    const response = await app.inject({
      method: 'POST',
      url: `/api/social/rooms/${roomId}/collections`,
      headers: { cookie: tokenCookie },
      payload: {
        name: 'Discussion Collection',
        type: 'discussion',
      },
    });

    expect(response.statusCode).toBe(201);
    const body = JSON.parse(response.payload);
    expect(body.type).toBe('discussion');
  });

  it('should return 400 when name is missing', async () => {
    const response = await app.inject({
      method: 'POST',
      url: `/api/social/rooms/${roomId}/collections`,
      headers: { cookie: tokenCookie },
      payload: {},
    });

    expect(response.statusCode).toBe(400);
  });

  it('should return 400 when name is empty string', async () => {
    const response = await app.inject({
      method: 'POST',
      url: `/api/social/rooms/${roomId}/collections`,
      headers: { cookie: tokenCookie },
      payload: {
        name: '',
      },
    });

    expect(response.statusCode).toBe(400);
  });

  it('should return 403 when not a member of room', async () => {
    const otherEmail = 'other_create_collection_test@example.com';
    await userRepository.deleteMany({ email: otherEmail });

    const otherUser = await userRepository.create({
      username: 'other_user',
      email: otherEmail,
      passwordHash: await argon2.hash(testPasswordRaw),
      passwordHashVersion: 2,
      pqcPublicKey: 'test-pqc-key',
    });

    const loginResponse = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: {
        email: 'other_create_collection_test@example.com',
        argon2Hash: testPasswordRaw,
      },
    });
    const cookies: string[] = [].concat(
      loginResponse.headers['set-cookie'] as any,
    );
    const otherTokenCookie = cookies.find((c) => c.startsWith('token='));

    const response = await app.inject({
      method: 'POST',
      url: `/api/social/rooms/${roomId}/collections`,
      headers: { cookie: otherTokenCookie },
      payload: {
        name: 'Should Fail',
      },
    });

    expect(response.statusCode).toBe(403);
  });

  it('should return 401 when not authenticated', async () => {
    const response = await app.inject({
      method: 'POST',
      url: `/api/social/rooms/${roomId}/collections`,
      payload: {
        name: 'Should Fail',
      },
    });

    expect(response.statusCode).toBe(401);
  });

  it('should return 403 when room does not exist', async () => {
    const fakeRoomId = new Types.ObjectId().toString();
    const response = await app.inject({
      method: 'POST',
      url: `/api/social/rooms/${fakeRoomId}/collections`,
      headers: { cookie: tokenCookie },
      payload: {
        name: 'Should Fail',
      },
    });

    expect(response.statusCode).toBe(403);
  });
});
