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

describe('Social (e2e) - PATCH /api/social/rooms/:roomId/collections/order', () => {
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
    username: 'reorder_collections_test',
    email: 'reorder_collections_test@example.com',
  };
  let userId: string;
  let tokenCookie: string | undefined;
  let roomId: string;
  let collectionIds: string[] = [];

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

    // Create multiple collections with initial order
    const col1 = await collectionRepository.create({
      roomId: room._id,
      name: 'Collection A',
      order: 0,
      type: 'links',
    } as any);

    const col2 = await collectionRepository.create({
      roomId: room._id,
      name: 'Collection B',
      order: 1,
      type: 'links',
    } as any);

    const col3 = await collectionRepository.create({
      roomId: room._id,
      name: 'Collection C',
      order: 2,
      type: 'links',
    } as any);

    collectionIds = [
      col1._id.toString(),
      col2._id.toString(),
      col3._id.toString(),
    ];
  });

  beforeEach(async () => {
    // Reset order to initial state
    await collectionRepository.bulkUpdateOrders(collectionIds);
  });

  it('should reorder collections successfully', async () => {
    const newOrder = [collectionIds[2], collectionIds[0], collectionIds[1]];

    const response = await app.inject({
      method: 'PATCH',
      url: `/api/social/rooms/${roomId}/collections/order`,
      headers: { cookie: tokenCookie },
      payload: {
        collectionIds: newOrder,
      },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.payload);
    expect(body.message).toBe('Collections reordered successfully');

    // Verify order in database
    const collections = await collectionRepository.findByRoom(roomId, {
      sort: { order: 1 },
    });
    expect(collections[0]._id.toString()).toBe(newOrder[0]);
    expect(collections[0].order).toBe(0);
    expect(collections[1]._id.toString()).toBe(newOrder[1]);
    expect(collections[1].order).toBe(1);
    expect(collections[2]._id.toString()).toBe(newOrder[2]);
    expect(collections[2].order).toBe(2);
  });

  it('should return 400 when collectionIds is not an array', async () => {
    const response = await app.inject({
      method: 'PATCH',
      url: `/api/social/rooms/${roomId}/collections/order`,
      headers: { cookie: tokenCookie },
      payload: {
        collectionIds: 'not-an-array',
      },
    });

    expect(response.statusCode).toBe(400);
  });

  it('should return 400 when collectionIds is empty array', async () => {
    const response = await app.inject({
      method: 'PATCH',
      url: `/api/social/rooms/${roomId}/collections/order`,
      headers: { cookie: tokenCookie },
      payload: {
        collectionIds: [],
      },
    });

    expect(response.statusCode).toBe(400);
  });

  it('should return 400 when collectionIds contains invalid MongoDB ID', async () => {
    const response = await app.inject({
      method: 'PATCH',
      url: `/api/social/rooms/${roomId}/collections/order`,
      headers: { cookie: tokenCookie },
      payload: {
        collectionIds: ['invalid-id', collectionIds[1]],
      },
    });

    expect(response.statusCode).toBe(400);
  });

  it('should return 400 when collectionIds is missing', async () => {
    const response = await app.inject({
      method: 'PATCH',
      url: `/api/social/rooms/${roomId}/collections/order`,
      headers: { cookie: tokenCookie },
      payload: {},
    });

    expect(response.statusCode).toBe(400);
  });

  it('should return 404 when room does not exist', async () => {
    const fakeRoomId = new Types.ObjectId().toString();
    const response = await app.inject({
      method: 'PATCH',
      url: `/api/social/rooms/${fakeRoomId}/collections/order`,
      headers: { cookie: tokenCookie },
      payload: {
        collectionIds: collectionIds,
      },
    });

    expect(response.statusCode).toBe(404);
  });

  it('should return 404 when user is not a member of the room', async () => {
    const otherEmail = 'other_reorder_test@example.com';
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
        email: otherEmail,
        argon2Hash: testPasswordRaw,
      },
    });
    const cookies: string[] = [].concat(
      loginResponse.headers['set-cookie'] as any,
    );
    const otherTokenCookie = cookies.find((c) => c.startsWith('token='));

    const response = await app.inject({
      method: 'PATCH',
      url: `/api/social/rooms/${roomId}/collections/order`,
      headers: { cookie: otherTokenCookie },
      payload: {
        collectionIds: collectionIds,
      },
    });

    expect(response.statusCode).toBe(404);
  });

  it('should return 401 when not authenticated', async () => {
    const response = await app.inject({
      method: 'PATCH',
      url: `/api/social/rooms/${roomId}/collections/order`,
      payload: {
        collectionIds: collectionIds,
      },
    });

    expect(response.statusCode).toBe(401);
  });

  it('should handle partial reordering (subset of collections)', async () => {
    // Reorder only first two collections
    const partialOrder = [collectionIds[1], collectionIds[0]];

    const response = await app.inject({
      method: 'PATCH',
      url: `/api/social/rooms/${roomId}/collections/order`,
      headers: { cookie: tokenCookie },
      payload: {
        collectionIds: partialOrder,
      },
    });

    expect(response.statusCode).toBe(200);

    // Verify those two got reordered
    const col1 = await collectionRepository.findById(collectionIds[0]);
    const col2 = await collectionRepository.findById(collectionIds[1]);

    expect(col2!.order).toBe(0);
    expect(col1!.order).toBe(1);
  });
});
