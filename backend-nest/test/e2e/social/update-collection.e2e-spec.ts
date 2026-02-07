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

describe('Social (e2e) - PATCH /api/social/collections/:collectionId', () => {
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
    username: 'update_collection_test',
    email: 'update_collection_test@example.com',
  };
  let userId: string;
  let tokenCookie: string | undefined;
  let roomId: string;
  let collectionId: string;

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

    const collection = await collectionRepository.create({
      roomId: room._id,
      name: 'Original Name',
      order: 0,
      type: 'links',
    } as any);
    collectionId = collection._id.toString();
  });

  beforeEach(async () => {
    // Reset collection name before each test
    await collectionRepository.updateById(collectionId, {
      $set: { name: 'Original Name' },
    } as any);
  });

  it('should update collection name (owner)', async () => {
    const response = await app.inject({
      method: 'PATCH',
      url: `/api/social/collections/${collectionId}`,
      headers: { cookie: tokenCookie },
      payload: {
        name: 'Updated Name',
      },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.payload);
    expect(body._id).toBe(collectionId);
    expect(body.name).toBe('Updated Name');
    expect(body.roomId).toBe(roomId);
    expect(body.type).toBe('links');
    expect(body.order).toBe(0);
    expect(body.createdAt).toBeDefined();
    expect(body.updatedAt).toBeDefined();

    const collection = await collectionRepository.findById(collectionId);
    expect(collection?.name).toBe('Updated Name');
  });

  it('should update collection name (admin)', async () => {
    const adminEmail = 'admin_update_collection_test@example.com';
    await userRepository.deleteMany({ email: adminEmail });

    const adminUser = await userRepository.create({
      username: 'admin_user',
      email: adminEmail,
      passwordHash: await argon2.hash(testPasswordRaw),
      passwordHashVersion: 2,
      pqcPublicKey: 'test-pqc-key',
    });

    await roomRepository.addMember(
      roomId,
      adminUser._id.toString(),
      'admin',
      'admin-encrypted-key',
    );

    const loginResponse = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: {
        email: adminEmail,
        argon2Hash: testPasswordRaw,
      },
    });
    const cookies: string[] = [].concat(
      loginResponse.headers['set-cookie'] as any,
    );
    const adminTokenCookie = cookies.find((c) => c.startsWith('token='));

    const response = await app.inject({
      method: 'PATCH',
      url: `/api/social/collections/${collectionId}`,
      headers: { cookie: adminTokenCookie },
      payload: {
        name: 'Admin Updated Name',
      },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.payload);
    expect(body.name).toBe('Admin Updated Name');

    // Cleanup
    await roomRepository.removeMember(roomId, adminUser._id.toString());
  });

  it('should return 400 when name is missing', async () => {
    const response = await app.inject({
      method: 'PATCH',
      url: `/api/social/collections/${collectionId}`,
      headers: { cookie: tokenCookie },
      payload: {},
    });

    expect(response.statusCode).toBe(400);
  });

  it('should return 400 when name is empty string', async () => {
    const response = await app.inject({
      method: 'PATCH',
      url: `/api/social/collections/${collectionId}`,
      headers: { cookie: tokenCookie },
      payload: {
        name: '',
      },
    });

    expect(response.statusCode).toBe(400);
  });

  it('should return 404 when collection does not exist', async () => {
    const fakeCollectionId = new Types.ObjectId().toString();
    const response = await app.inject({
      method: 'PATCH',
      url: `/api/social/collections/${fakeCollectionId}`,
      headers: { cookie: tokenCookie },
      payload: {
        name: 'Should Fail',
      },
    });

    expect(response.statusCode).toBe(404);
  });

  it('should return 403 when user is regular member (not owner/admin)', async () => {
    const memberEmail = 'member_update_collection_test@example.com';
    await userRepository.deleteMany({ email: memberEmail });

    const memberUser = await userRepository.create({
      username: 'member_user',
      email: memberEmail,
      passwordHash: await argon2.hash(testPasswordRaw),
      passwordHashVersion: 2,
      pqcPublicKey: 'test-pqc-key',
    });

    await roomRepository.addMember(
      roomId,
      memberUser._id.toString(),
      'member',
      'member-encrypted-key',
    );

    const loginResponse = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: {
        email: memberEmail,
        argon2Hash: testPasswordRaw,
      },
    });
    const cookies: string[] = [].concat(
      loginResponse.headers['set-cookie'] as any,
    );
    const memberTokenCookie = cookies.find((c) => c.startsWith('token='));

    const response = await app.inject({
      method: 'PATCH',
      url: `/api/social/collections/${collectionId}`,
      headers: { cookie: memberTokenCookie },
      payload: {
        name: 'Should Fail',
      },
    });

    expect(response.statusCode).toBe(403);

    // Cleanup
    await roomRepository.removeMember(roomId, memberUser._id.toString());
  });

  it('should return 401 when not authenticated', async () => {
    const response = await app.inject({
      method: 'PATCH',
      url: `/api/social/collections/${collectionId}`,
      payload: {
        name: 'Should Fail',
      },
    });

    expect(response.statusCode).toBe(401);
  });
});
