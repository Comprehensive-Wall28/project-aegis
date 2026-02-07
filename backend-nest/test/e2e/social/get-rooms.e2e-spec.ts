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
import {
  Room,
  RoomDocument,
} from '../../../src/modules/social/schemas/room.schema';

describe('Social (e2e) - GET /api/social/rooms', () => {
  let app: NestFastifyApplication;
  let userRepository: UserRepository;
  let roomRepository: RoomRepository;
  let roomModel: Model<RoomDocument>;

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
    roomModel = moduleFixture.get<Model<RoomDocument>>(
      getModelToken(Room.name, 'primary'),
    );
  });

  afterAll(async () => {
    await app.close();
  });

  const testPasswordRaw = 'password123';
  const testUser = {
    username: 'rooms_test',
    email: 'rooms_test@example.com',
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
  });

  it('should return empty list when user has no rooms', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/social/rooms',
      headers: { cookie: tokenCookie },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.payload);
    expect(Array.isArray(body)).toBe(true);
    expect(body.length).toBe(0);
  });

  it('should return rooms with correct structure', async () => {
    const room = await roomModel.create({
      name: 'Test Room',
      description: 'Test Description',
      icon: 'test-icon',
      members: [
        {
          userId: new Types.ObjectId(userId),
          role: 'owner',
          encryptedRoomKey: 'mock-room-key',
        },
      ],
    } as any);

    const response = await app.inject({
      method: 'GET',
      url: '/api/social/rooms',
      headers: { cookie: tokenCookie },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.payload);
    expect(Array.isArray(body)).toBe(true);
    expect(body.length).toBe(1);
    expect(body[0]._id).toBe(room._id.toString());
    expect(body[0].name).toBe('Test Room');
    expect(body[0].description).toBe('Test Description');
    expect(body[0].icon).toBe('test-icon');
    expect(body[0].role).toBe('owner');
    expect(body[0].encryptedRoomKey).toBe('mock-room-key');
  });

  it('should return multiple rooms with correct roles', async () => {
    await roomModel.create({
      name: 'Room 1',
      description: '',
      icon: '',
      members: [
        {
          userId: new Types.ObjectId(userId),
          role: 'owner',
          encryptedRoomKey: 'key-1',
        },
      ],
    } as any);

    await roomModel.create({
      name: 'Room 2',
      description: '',
      icon: '',
      members: [
        {
          userId: new Types.ObjectId(userId),
          role: 'member',
          encryptedRoomKey: 'key-2',
        },
      ],
    } as any);

    await roomModel.create({
      name: 'Room 3',
      description: '',
      icon: '',
      members: [
        {
          userId: new Types.ObjectId(userId),
          role: 'admin',
          encryptedRoomKey: 'key-3',
        },
      ],
    } as any);

    const response = await app.inject({
      method: 'GET',
      url: '/api/social/rooms',
      headers: { cookie: tokenCookie },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.payload);
    expect(Array.isArray(body)).toBe(true);
    expect(body.length).toBe(3);

    const roles = body.map((room: any) => room.role);
    expect(roles).toContain('owner');
    expect(roles).toContain('member');
    expect(roles).toContain('admin');
  });

  it('should not return rooms of other users', async () => {
    const otherUserEmail = 'other_rooms@example.com';
    await userRepository.deleteMany({ email: otherUserEmail });

    const otherUser = await userRepository.create({
      username: 'other_rooms_user',
      email: otherUserEmail,
      passwordHash: await argon2.hash(testPasswordRaw),
      passwordHashVersion: 2,
      pqcPublicKey: 'test-pqc-key-other',
    });

    await roomModel.create({
      name: 'Other User Room',
      description: '',
      icon: '',
      members: [
        {
          userId: otherUser._id,
          role: 'owner',
          encryptedRoomKey: 'other-key',
        },
      ],
    } as any);

    const response = await app.inject({
      method: 'GET',
      url: '/api/social/rooms',
      headers: { cookie: tokenCookie },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.payload);
    expect(Array.isArray(body)).toBe(true);
    const roomNames = body.map((room: any) => room.name);
    expect(roomNames).not.toContain('Other User Room');

    await userRepository.deleteById(otherUser._id.toString());
    await roomModel.deleteMany({ 'members.userId': otherUser._id });
  });

  it('should return 401 when not authenticated', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/social/rooms',
    });

    expect(response.statusCode).toBe(401);
  });
});
