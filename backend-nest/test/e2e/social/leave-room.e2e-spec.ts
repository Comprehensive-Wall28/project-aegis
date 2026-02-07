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

describe('Social (e2e) - POST /api/social/rooms/:roomId/leave', () => {
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
    username: 'leave_test',
    email: 'leave_test@example.com',
  };
  let userId: string;
  let tokenCookie: string | undefined;

  beforeEach(async () => {
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
    await roomModel.deleteMany({});
    await collectionModel.deleteMany({});
  });

  async function createRoom(
    userId: string,
    role: 'owner' | 'admin' | 'member' = 'owner',
  ): Promise<string> {
    const room = await roomRepository.create({
      name: 'Test Room',
      description: '',
      icon: '',
      members: [
        {
          userId: new Types.ObjectId(userId),
          role,
          encryptedRoomKey: 'encrypted-key',
        },
      ],
    } as any);

    await collectionRepository.create({
      roomId: room._id,
      name: '',
      type: 'links',
    } as any);

    return room._id.toString();
  }

  async function createRoomWithMultipleOwners(
    owner1Id: string,
    owner2Id: string,
  ): Promise<string> {
    const room = await roomRepository.create({
      name: 'Multi-Owner Room',
      description: '',
      icon: '',
      members: [
        {
          userId: new Types.ObjectId(owner1Id),
          role: 'owner',
          encryptedRoomKey: 'owner1-key',
        },
        {
          userId: new Types.ObjectId(owner2Id),
          role: 'owner',
          encryptedRoomKey: 'owner2-key',
        },
      ],
    } as any);

    await collectionRepository.create({
      roomId: room._id,
      name: '',
      type: 'links',
    } as any);

    return room._id.toString();
  }

  async function createSecondUser(): Promise<{
    userId: string;
    tokenCookie: string;
  }> {
    const secondUser = {
      username: 'leave_test_2',
      email: 'leave_test_2@example.com',
    };
    await userRepository.deleteMany({ email: secondUser.email });
    const user = await userRepository.create({
      username: secondUser.username,
      email: secondUser.email,
      passwordHash: await argon2.hash(testPasswordRaw),
      passwordHashVersion: 2,
      pqcPublicKey: 'test-pqc-key-2',
    });

    const loginResponse = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: {
        email: secondUser.email,
        argon2Hash: testPasswordRaw,
      },
    });
    const cookies: string[] = [].concat(
      loginResponse.headers['set-cookie'] as any,
    );
    const tokenCookie = cookies.find((c) => c.startsWith('token='));

    return { userId: user._id.toString(), tokenCookie: tokenCookie || '' };
  }

  it('should leave a room successfully', async () => {
    const roomId = await createRoom(userId, 'member');

    const response = await app.inject({
      method: 'POST',
      url: `/api/social/rooms/${roomId}/leave`,
      headers: { cookie: tokenCookie },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.payload);
    expect(body.message).toBe('Successfully left room');

    const room = await roomRepository.findById(roomId);
    expect(room?.members.length).toBe(0);
  });

  it('should return 404 for non-existent room', async () => {
    const fakeRoomId = new Types.ObjectId().toString();

    const response = await app.inject({
      method: 'POST',
      url: `/api/social/rooms/${fakeRoomId}/leave`,
      headers: { cookie: tokenCookie },
    });

    expect(response.statusCode).toBe(404);
  });

  it('should return 404 if user is not a member of the room', async () => {
    const room = await roomRepository.create({
      name: 'Other User Room',
      description: '',
      icon: '',
      members: [
        {
          userId: new Types.ObjectId(),
          role: 'owner',
          encryptedRoomKey: 'other-key',
        },
      ],
    } as any);

    await collectionRepository.create({
      roomId: room._id,
      name: '',
      type: 'links',
    } as any);

    const response = await app.inject({
      method: 'POST',
      url: `/api/social/rooms/${room._id.toString()}/leave`,
      headers: { cookie: tokenCookie },
    });

    expect(response.statusCode).toBe(404);
  });

  it('should return 400 when last owner tries to leave', async () => {
    const roomId = await createRoom(userId, 'owner');

    const response = await app.inject({
      method: 'POST',
      url: `/api/social/rooms/${roomId}/leave`,
      headers: { cookie: tokenCookie },
    });

    expect(response.statusCode).toBe(400);
    const body = JSON.parse(response.payload);
    expect(body.message).toBe(
      'Cannot leave room as the last owner. Delete the room instead.',
    );
  });

  it('should allow owner to leave if there are multiple owners', async () => {
    const { userId: owner2Id, tokenCookie: owner2Token } =
      await createSecondUser();
    const roomId = await createRoomWithMultipleOwners(userId, owner2Id);

    const response = await app.inject({
      method: 'POST',
      url: `/api/social/rooms/${roomId}/leave`,
      headers: { cookie: owner2Token },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.payload);
    expect(body.message).toBe('Successfully left room');

    const room = await roomRepository.findById(roomId);
    expect(room?.members.length).toBe(1);
    expect(room?.members[0].role).toBe('owner');
  });

  it('should return 401 when not authenticated', async () => {
    const roomId = await createRoom(userId);

    const response = await app.inject({
      method: 'POST',
      url: `/api/social/rooms/${roomId}/leave`,
    });

    expect(response.statusCode).toBe(401);
  });

  it('should allow admin to leave room', async () => {
    const adminUser = {
      username: 'admin_user',
      email: 'admin_user@example.com',
    };
    await userRepository.deleteMany({ email: adminUser.email });
    const adminUserDoc = await userRepository.create({
      username: adminUser.username,
      email: adminUser.email,
      passwordHash: await argon2.hash(testPasswordRaw),
      passwordHashVersion: 2,
      pqcPublicKey: 'admin-pqc-key',
    });

    const room = await roomRepository.create({
      name: 'Admin Room',
      description: '',
      icon: '',
      members: [
        {
          userId: new Types.ObjectId(userId),
          role: 'owner',
          encryptedRoomKey: 'owner-key',
        },
        {
          userId: adminUserDoc._id,
          role: 'admin',
          encryptedRoomKey: 'admin-key',
        },
      ],
    } as any);

    await collectionRepository.create({
      roomId: room._id,
      name: '',
      type: 'links',
    } as any);

    const loginResponse = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: {
        email: adminUser.email,
        argon2Hash: testPasswordRaw,
      },
    });
    const cookies: string[] = [].concat(
      loginResponse.headers['set-cookie'] as any,
    );
    const adminToken = cookies.find((c) => c.startsWith('token='));

    const response = await app.inject({
      method: 'POST',
      url: `/api/social/rooms/${room._id.toString()}/leave`,
      headers: { cookie: adminToken },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.payload);
    expect(body.message).toBe('Successfully left room');
  });
});
