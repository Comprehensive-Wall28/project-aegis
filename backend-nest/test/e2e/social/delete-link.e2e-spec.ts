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

describe('Social (e2e) - DELETE /api/social/links/:linkId', () => {
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
  const ownerUser = {
    username: 'delete_link_owner',
    email: 'delete_link_owner@example.com',
  };
  const creatorUser = {
    username: 'delete_link_creator',
    email: 'delete_link_creator@example.com',
  };
  const otherMemberUser = {
    username: 'delete_link_other',
    email: 'delete_link_other@example.com',
  };
  let ownerUserId: string;
  let creatorUserId: string;
  let otherMemberUserId: string;
  let ownerTokenCookie: string | undefined;
  let creatorTokenCookie: string | undefined;
  let otherMemberTokenCookie: string | undefined;
  let roomId: string;
  let collectionId: string;

  beforeAll(async () => {
    // Create users
    for (const u of [ownerUser, creatorUser, otherMemberUser]) {
      await userRepository.deleteMany({ email: u.email });
    }

    const owner = await userRepository.create({
      username: ownerUser.username,
      email: ownerUser.email,
      passwordHash: await argon2.hash(testPasswordRaw),
      passwordHashVersion: 2,
      pqcPublicKey: 'test-pqc-key',
    });
    ownerUserId = owner._id.toString();

    const creator = await userRepository.create({
      username: creatorUser.username,
      email: creatorUser.email,
      passwordHash: await argon2.hash(testPasswordRaw),
      passwordHashVersion: 2,
      pqcPublicKey: 'test-pqc-key',
    });
    creatorUserId = creator._id.toString();

    const other = await userRepository.create({
      username: otherMemberUser.username,
      email: otherMemberUser.email,
      passwordHash: await argon2.hash(testPasswordRaw),
      passwordHashVersion: 2,
      pqcPublicKey: 'test-pqc-key',
    });
    otherMemberUserId = other._id.toString();

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

    ownerTokenCookie = await login(ownerUser.email);
    creatorTokenCookie = await login(creatorUser.email);
    otherMemberTokenCookie = await login(otherMemberUser.email);

    // Create room
    const room = await roomRepository.create({
      name: 'Delete Link Room',
      members: [
        {
          userId: new Types.ObjectId(ownerUserId),
          role: 'owner',
          encryptedRoomKey: 'key1',
        },
        {
          userId: new Types.ObjectId(creatorUserId),
          role: 'member',
          encryptedRoomKey: 'key2',
        },
        {
          userId: new Types.ObjectId(otherMemberUserId),
          role: 'member',
          encryptedRoomKey: 'key3',
        },
      ],
    } as any);
    roomId = room._id.toString();

    // Create collection
    const collection = await collectionRepository.create({
      roomId: room._id,
      name: 'Links',
      order: 0,
      type: 'links',
    } as any);
    collectionId = collection._id.toString();
  });

  it('should delete a link as the creator', async () => {
    const link = await linkPostRepository.create({
      collectionId: new Types.ObjectId(collectionId),
      userId: new Types.ObjectId(creatorUserId),
      url: 'https://example.com/creator',
      previewData: { title: 'Creator Link', scrapeStatus: 'success' },
    } as any);

    const response = await app.inject({
      method: 'DELETE',
      url: `/api/social/links/${link._id.toString()}`,
      headers: { cookie: creatorTokenCookie },
    });

    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.payload).message).toBe(
      'Link deleted successfully',
    );

    const deleted = await linkPostRepository.findById(link._id.toString());
    expect(deleted).toBeNull();
  });

  it('should delete a link as the room owner', async () => {
    const link = await linkPostRepository.create({
      collectionId: new Types.ObjectId(collectionId),
      userId: new Types.ObjectId(creatorUserId),
      url: 'https://example.com/owner-delete',
      previewData: { title: 'Owner Delete Link', scrapeStatus: 'success' },
    } as any);

    const response = await app.inject({
      method: 'DELETE',
      url: `/api/social/links/${link._id.toString()}`,
      headers: { cookie: ownerTokenCookie },
    });

    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.payload).message).toBe(
      'Link deleted successfully',
    );

    const deleted = await linkPostRepository.findById(link._id.toString());
    expect(deleted).toBeNull();
  });

  it("should return 403 when trying to delete someone else's link as a regular member", async () => {
    const link = await linkPostRepository.create({
      collectionId: new Types.ObjectId(collectionId),
      userId: new Types.ObjectId(creatorUserId),
      url: 'https://example.com/forbidden',
      previewData: { title: 'Forbidden Link', scrapeStatus: 'success' },
    } as any);

    const response = await app.inject({
      method: 'DELETE',
      url: `/api/social/links/${link._id.toString()}`,
      headers: { cookie: otherMemberTokenCookie },
    });

    expect(response.statusCode).toBe(403);
    expect(JSON.parse(response.payload).message).toBe(
      'Only post creator or room owner can delete links',
    );

    const stillExists = await linkPostRepository.findById(link._id.toString());
    expect(stillExists).not.toBeNull();
  });

  it('should return 403 when not a member of the room', async () => {
    // Create another user not in the room
    const outsideUserEmail = 'outside@example.com';
    await userRepository.deleteMany({ email: outsideUserEmail });
    await userRepository.create({
      username: 'outside',
      email: outsideUserEmail,
      passwordHash: await argon2.hash(testPasswordRaw),
      passwordHashVersion: 2,
      pqcPublicKey: 'test-pqc-key',
    });

    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { email: outsideUserEmail, argon2Hash: testPasswordRaw },
    });
    const cookies: string[] = [].concat(res.headers['set-cookie'] as any);
    const outsideTokenCookie = cookies.find((c) => c.startsWith('token='));

    const link = await linkPostRepository.create({
      collectionId: new Types.ObjectId(collectionId),
      userId: new Types.ObjectId(creatorUserId),
      url: 'https://example.com/outside',
      previewData: { title: 'Outside Link', scrapeStatus: 'success' },
    } as any);

    const response = await app.inject({
      method: 'DELETE',
      url: `/api/social/links/${link._id.toString()}`,
      headers: { cookie: outsideTokenCookie },
    });

    expect(response.statusCode).toBe(403);
    expect(JSON.parse(response.payload).message).toBe(
      'Not a member of this room',
    );
  });

  it('should return 404 for non-existent link', async () => {
    const fakeId = new Types.ObjectId().toString();
    const response = await app.inject({
      method: 'DELETE',
      url: `/api/social/links/${fakeId}`,
      headers: { cookie: ownerTokenCookie },
    });

    expect(response.statusCode).toBe(404);
  });
});
