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

describe('Social (e2e) - POST /api/social/rooms', () => {
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
    username: 'create_room_test',
    email: 'create_room_test@example.com',
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

  beforeEach(async () => {
    await roomModel.deleteMany({
      'members.userId': new Types.ObjectId(userId),
    });
    await collectionModel.deleteMany({});
  });

  it('should create a room with required fields', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/social/rooms',
      headers: { cookie: tokenCookie },
      payload: {
        name: 'Test Room',
        encryptedRoomKey: 'mock-encrypted-key',
      },
    });

    expect(response.statusCode).toBe(201);
    const body = JSON.parse(response.payload);
    expect(body._id).toBeDefined();
    expect(body.name).toBe('Test Room');
    expect(body.description).toBe('');
    expect(body.icon).toBe('');
    expect(Array.isArray(body.members)).toBe(true);
    expect(body.members.length).toBe(1);
    expect(body.members[0].role).toBe('owner');
    expect(body.members[0].encryptedRoomKey).toBe('mock-encrypted-key');

    const rooms = await roomRepository.findByMember(userId);
    expect(rooms.length).toBe(1);
    expect(rooms[0].name).toBe('Test Room');

    const collections = await collectionRepository.findByRoom(body._id);
    expect(collections.length).toBe(1);
    expect(collections[0].name).toBe('');
    expect(collections[0].type).toBe('links');
  });

  it('should create a room with all optional fields', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/social/rooms',
      headers: { cookie: tokenCookie },
      payload: {
        name: 'Full Room',
        description: 'Room description',
        icon: 'room-icon',
        encryptedRoomKey: 'full-encrypted-key',
      },
    });

    expect(response.statusCode).toBe(201);
    const body = JSON.parse(response.payload);
    expect(body.name).toBe('Full Room');
    expect(body.description).toBe('Room description');
    expect(body.icon).toBe('room-icon');
    expect(body.members[0].encryptedRoomKey).toBe('full-encrypted-key');
  });

  it('should return 400 when name is missing', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/social/rooms',
      headers: { cookie: tokenCookie },
      payload: {
        encryptedRoomKey: 'some-key',
      },
    });

    expect(response.statusCode).toBe(400);
  });

  it('should return 400 when encryptedRoomKey is missing', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/social/rooms',
      headers: { cookie: tokenCookie },
      payload: {
        name: 'Test Room',
      },
    });

    expect(response.statusCode).toBe(400);
  });

  it('should return 400 when name is empty string', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/social/rooms',
      headers: { cookie: tokenCookie },
      payload: {
        name: '',
        encryptedRoomKey: 'some-key',
      },
    });

    expect(response.statusCode).toBe(400);
  });

  it('should return 401 when not authenticated', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/social/rooms',
      payload: {
        name: 'Test Room',
        encryptedRoomKey: 'some-key',
      },
    });

    expect(response.statusCode).toBe(401);
  });

  it('should create multiple rooms for the same user', async () => {
    await app.inject({
      method: 'POST',
      url: '/api/social/rooms',
      headers: { cookie: tokenCookie },
      payload: {
        name: 'Room 1',
        encryptedRoomKey: 'key-1',
      },
    });

    await app.inject({
      method: 'POST',
      url: '/api/social/rooms',
      headers: { cookie: tokenCookie },
      payload: {
        name: 'Room 2',
        encryptedRoomKey: 'key-2',
      },
    });

    const rooms = await roomRepository.findByMember(userId);
    expect(rooms.length).toBe(2);

    const roomNames = rooms.map((r) => r.name);
    expect(roomNames).toContain('Room 1');
    expect(roomNames).toContain('Room 2');
  });
});
