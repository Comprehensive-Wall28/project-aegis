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

describe('Social (e2e) - PATCH /api/social/links/:linkId (move link)', () => {
  let app: NestFastifyApplication;
  let userRepository: UserRepository;
  let roomRepository: RoomRepository;
  let collectionRepository: CollectionRepository;
  let linkPostRepository: LinkPostRepository;
  let roomModel: Model<RoomDocument>;
  let collectionModel: Model<CollectionDocument>;
  let linkPostModel: Model<LinkPostDocument>;

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
    roomModel = moduleFixture.get<Model<RoomDocument>>(
      getModelToken(Room.name, 'primary'),
    );
    collectionModel = moduleFixture.get<Model<CollectionDocument>>(
      getModelToken(Collection.name, 'primary'),
    );
    linkPostModel = moduleFixture.get<Model<LinkPostDocument>>(
      getModelToken(LinkPost.name, 'primary'),
    );
  });

  afterAll(async () => {
    await app.close();
  });

  const testPasswordRaw = 'password123';
  const memberUser = {
    username: 'move_link_member',
    email: 'move_link_member@example.com',
  };
  const otherUser = {
    username: 'move_link_other',
    email: 'move_link_other@example.com',
  };
  let memberUserId: string;
  let otherUserId: string;
  let memberTokenCookie: string | undefined;
  let otherTokenCookie: string | undefined;
  let roomId: string;
  let sourceCollectionId: string;
  let targetCollectionId: string;

  beforeAll(async () => {
    // Create users
    for (const u of [memberUser, otherUser]) {
      await userRepository.deleteMany({ email: u.email });
    }

    const member = await userRepository.create({
      username: memberUser.username,
      email: memberUser.email,
      passwordHash: await argon2.hash(testPasswordRaw),
      passwordHashVersion: 2,
      pqcPublicKey: 'test-pqc-key',
    });
    memberUserId = member._id.toString();

    const other = await userRepository.create({
      username: otherUser.username,
      email: otherUser.email,
      passwordHash: await argon2.hash(testPasswordRaw),
      passwordHashVersion: 2,
      pqcPublicKey: 'test-pqc-key',
    });
    otherUserId = other._id.toString();

    // Login users
    const login = async (email: string) => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: { email, argon2Hash: testPasswordRaw },
      });
      const cookies: string[] = [].concat(res.headers['set-cookie'] as any);
      return cookies.find((c) => c.startsWith('token='));
    };

    memberTokenCookie = await login(memberUser.email);
    otherTokenCookie = await login(otherUser.email);

    // Create room
    const room = await roomRepository.create({
      name: 'Move Link Room',
      members: [
        {
          userId: new Types.ObjectId(memberUserId),
          role: 'member',
          encryptedRoomKey: 'key1',
        },
      ],
    } as any);
    roomId = room._id.toString();

    // Create collections
    const sourceColl = await collectionRepository.create({
      roomId: room._id,
      name: 'Source',
      order: 0,
      type: 'links',
    } as any);
    sourceCollectionId = sourceColl._id.toString();

    const targetColl = await collectionRepository.create({
      roomId: room._id,
      name: 'Target',
      order: 1,
      type: 'links',
    } as any);
    targetCollectionId = targetColl._id.toString();
  });

  it('should move a link to another collection in the same room', async () => {
    const link = await linkPostRepository.create({
      collectionId: new Types.ObjectId(sourceCollectionId),
      userId: new Types.ObjectId(memberUserId),
      url: 'https://example.com/move-me',
      previewData: { title: 'Move Me', scrapeStatus: 'success' },
    } as any);

    const response = await app.inject({
      method: 'PATCH',
      url: `/api/social/links/${link._id.toString()}`,
      headers: { cookie: memberTokenCookie },
      payload: { collectionId: targetCollectionId },
    });

    expect(response.statusCode).toBe(200);
    const payload = JSON.parse(response.payload);
    expect(payload.message).toBe('Link moved successfully');
    expect(payload.linkPost.collectionId).toBe(targetCollectionId);

    const updated = await linkPostRepository.findById(link._id.toString());
    expect(updated?.collectionId.toString()).toBe(targetCollectionId);
  });

  it('should return 400 when missing collectionId', async () => {
    const link = await linkPostRepository.create({
      collectionId: new Types.ObjectId(sourceCollectionId),
      userId: new Types.ObjectId(memberUserId),
      url: 'https://example.com/missing-id',
      previewData: { title: 'Missing ID', scrapeStatus: 'success' },
    } as any);

    const response = await app.inject({
      method: 'PATCH',
      url: `/api/social/links/${link._id.toString()}`,
      headers: { cookie: memberTokenCookie },
      payload: {},
    });

    expect(response.statusCode).toBe(400);
  });

  it('should return 400 when trying to move to a different room', async () => {
    // Create another room and collection
    const otherRoom = await roomRepository.create({
      name: 'Other Room',
      members: [
        {
          userId: new Types.ObjectId(memberUserId),
          role: 'owner',
          encryptedRoomKey: 'other-key',
        },
      ],
    } as any);
    const otherColl = await collectionRepository.create({
      roomId: otherRoom._id,
      name: 'Other Coll',
      order: 0,
      type: 'links',
    } as any);

    const link = await linkPostRepository.create({
      collectionId: new Types.ObjectId(sourceCollectionId),
      userId: new Types.ObjectId(memberUserId),
      url: 'https://example.com/wrong-room',
      previewData: { title: 'Wrong Room', scrapeStatus: 'success' },
    } as any);

    const response = await app.inject({
      method: 'PATCH',
      url: `/api/social/links/${link._id.toString()}`,
      headers: { cookie: memberTokenCookie },
      payload: { collectionId: otherColl._id.toString() },
    });

    expect(response.statusCode).toBe(400);
    expect(JSON.parse(response.payload).message).toBe(
      'Cannot move link to a different room',
    );
  });

  it('should return 403 when user is not a member of the room', async () => {
    const link = await linkPostRepository.create({
      collectionId: new Types.ObjectId(sourceCollectionId),
      userId: new Types.ObjectId(memberUserId),
      url: 'https://example.com/no-access',
      previewData: { title: 'No Access', scrapeStatus: 'success' },
    } as any);

    const response = await app.inject({
      method: 'PATCH',
      url: `/api/social/links/${link._id.toString()}`,
      headers: { cookie: otherTokenCookie },
      payload: { collectionId: targetCollectionId },
    });

    expect(response.statusCode).toBe(403);
    expect(JSON.parse(response.payload).message).toBe(
      'Not a member of this room',
    );
  });

  it('should return 404 for non-existent link', async () => {
    const fakeLinkId = new Types.ObjectId().toString();
    const response = await app.inject({
      method: 'PATCH',
      url: `/api/social/links/${fakeLinkId}`,
      headers: { cookie: memberTokenCookie },
      payload: { collectionId: targetCollectionId },
    });

    expect(response.statusCode).toBe(404);
  });

  it('should return 404 for non-existent target collection', async () => {
    const link = await linkPostRepository.create({
      collectionId: new Types.ObjectId(sourceCollectionId),
      userId: new Types.ObjectId(memberUserId),
      url: 'https://example.com/bad-target',
      previewData: { title: 'Bad Target', scrapeStatus: 'success' },
    } as any);

    const fakeCollId = new Types.ObjectId().toString();
    const response = await app.inject({
      method: 'PATCH',
      url: `/api/social/links/${link._id.toString()}`,
      headers: { cookie: memberTokenCookie },
      payload: { collectionId: fakeCollId },
    });

    expect(response.statusCode).toBe(404);
  });
});
