import { Test, TestingModule } from '@nestjs/testing';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
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
import { LinkViewRepository } from '../../../src/modules/social/repositories/link-view.repository';
import { LinkCommentRepository } from '../../../src/modules/social/repositories/link-comment.repository';
import { LinkPost, LinkPostDocument } from '../../../src/modules/social/schemas/link-post.schema';
import { LinkView, LinkViewDocument } from '../../../src/modules/social/schemas/link-view.schema';
import { LinkComment, LinkCommentDocument } from '../../../src/modules/social/schemas/link-comment.schema';

describe('Social (e2e) - GET /api/social/rooms/:roomId', () => {
    let app: NestFastifyApplication;
    let userRepository: UserRepository;
    let roomRepository: RoomRepository;
    let collectionRepository: CollectionRepository;
    let linkPostRepository: LinkPostRepository;
    let linkViewRepository: LinkViewRepository;
    let linkCommentRepository: LinkCommentRepository;
    let linkPostModel: Model<LinkPostDocument>;
    let linkViewModel: Model<LinkViewDocument>;
    let linkCommentModel: Model<LinkCommentDocument>;

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

        app.useGlobalPipes(new ValidationPipe({
            whitelist: true,
            transform: true,
            forbidNonWhitelisted: true,
        }));

        await app.init();
        await app.getHttpAdapter().getInstance().ready();

        userRepository = moduleFixture.get<UserRepository>(UserRepository);
        roomRepository = moduleFixture.get<RoomRepository>(RoomRepository);
        collectionRepository = moduleFixture.get<CollectionRepository>(CollectionRepository);
        linkPostRepository = moduleFixture.get<LinkPostRepository>(LinkPostRepository);
        linkViewRepository = moduleFixture.get<LinkViewRepository>(LinkViewRepository);
        linkCommentRepository = moduleFixture.get<LinkCommentRepository>(LinkCommentRepository);
        linkPostModel = moduleFixture.get<Model<LinkPostDocument>>(getModelToken(LinkPost.name, 'primary'));
        linkViewModel = moduleFixture.get<Model<LinkViewDocument>>(getModelToken(LinkView.name, 'primary'));
        linkCommentModel = moduleFixture.get<Model<LinkCommentDocument>>(getModelToken(LinkComment.name, 'primary'));
    });

    afterAll(async () => {
        await app.close();
    });

    const testPasswordRaw = 'password123';
    const testUser = {
        username: 'room_content_main_user',
        email: 'room_content_main_user@example.com',
    };
    let userId: string;
    let tokenCookie: string | undefined;
    let roomId: string;
    let collectionId1: string;
    let collectionId2: string;

    beforeAll(async () => {
        await userRepository.deleteMany({ email: testUser.email });
        const user = await userRepository.create({
            username: testUser.username,
            email: testUser.email,
            passwordHash: await argon2.hash(testPasswordRaw),
            passwordHashVersion: 2,
            pqcPublicKey: 'test-pqc-key'
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
        const cookies: string[] = [].concat(loginResponse.headers['set-cookie'] as any);
        tokenCookie = cookies.find(c => c.startsWith('token='));

        const room = await roomRepository.create({
            name: 'Test Room',
            description: 'Room description',
            icon: 'room-icon',
            members: [{
                userId: new Types.ObjectId(userId),
                role: 'owner',
                encryptedRoomKey: 'test-encrypted-key'
            }]
        } as any);
        roomId = room._id.toString();

        const c1 = await collectionRepository.create({
            roomId: room._id,
            name: 'Collection 1',
            order: 0,
            type: 'links'
        } as any);
        collectionId1 = c1._id.toString();

        const c2 = await collectionRepository.create({
            roomId: room._id,
            name: 'Collection 2',
            order: 1,
            type: 'links'
        } as any);
        collectionId2 = c2._id.toString();
    });

    beforeEach(async () => {
        await linkPostModel.deleteMany({ collectionId: { $in: [new Types.ObjectId(collectionId1), new Types.ObjectId(collectionId2)] } });
        await linkViewModel.deleteMany({ roomId: new Types.ObjectId(roomId) });
        await linkCommentModel.deleteMany({});
    });

    it('should return room content with default collection links', async () => {
        const link = await linkPostModel.create({
            collectionId: new Types.ObjectId(collectionId1),
            userId: new Types.ObjectId(userId),
            url: 'https://example.com/1'
        });

        const response = await app.inject({
            method: 'GET',
            url: `/api/social/rooms/${roomId}`,
            headers: { cookie: tokenCookie },
        });

        expect(response.statusCode).toBe(200);
        const body = JSON.parse(response.payload);

        expect(body.room.name).toBe('Test Room');
        expect(body.room.role).toBe('owner');
        expect(body.collections.length).toBe(2);
        expect(body.collections[0]._id).toBe(collectionId1);

        expect(body.links.length).toBe(1);
        expect(body.links[0]._id).toBe(link._id.toString());

        expect(body.unviewedCounts[collectionId1]).toBe(1);
        expect(body.unviewedCounts[collectionId2]).toBe(0);
    });

    it('should return room content for a specific collection', async () => {
        await linkPostModel.create({
            collectionId: new Types.ObjectId(collectionId1),
            userId: new Types.ObjectId(userId),
            url: 'https://example.com/1'
        });
        const link2 = await linkPostModel.create({
            collectionId: new Types.ObjectId(collectionId2),
            userId: new Types.ObjectId(userId),
            url: 'https://example.com/2'
        });

        const response = await app.inject({
            method: 'GET',
            url: `/api/social/rooms/${roomId}?collectionId=${collectionId2}`,
            headers: { cookie: tokenCookie },
        });

        expect(response.statusCode).toBe(200);
        const body = JSON.parse(response.payload);

        expect(body.links.length).toBe(1);
        expect(body.links[0]._id).toBe(link2._id.toString());
        expect(body.unviewedCounts[collectionId1]).toBe(1);
        expect(body.unviewedCounts[collectionId2]).toBe(1);
    });

    it('should correctly calculate unviewed counts', async () => {
        const link1 = await linkPostModel.create({
            collectionId: new Types.ObjectId(collectionId1),
            userId: new Types.ObjectId(userId),
            url: 'https://example.com/1'
        });
        await linkPostModel.create({
            collectionId: new Types.ObjectId(collectionId1),
            userId: new Types.ObjectId(userId),
            url: 'https://example.com/2'
        });

        // Mark link1 as viewed
        await linkViewModel.create({
            userId: new Types.ObjectId(userId),
            linkId: link1._id,
            roomId: new Types.ObjectId(roomId),
            collectionId: new Types.ObjectId(collectionId1)
        });

        const response = await app.inject({
            method: 'GET',
            url: `/api/social/rooms/${roomId}`,
            headers: { cookie: tokenCookie },
        });

        expect(response.statusCode).toBe(200);
        const body = JSON.parse(response.payload);

        expect(body.unviewedCounts[collectionId1]).toBe(1);
        expect(body.viewedLinkIds).toContain(link1._id.toString());
    });

    it('should return 404 when room does not exist', async () => {
        const fakeRoomId = new Types.ObjectId().toString();
        const response = await app.inject({
            method: 'GET',
            url: `/api/social/rooms/${fakeRoomId}`,
            headers: { cookie: tokenCookie },
        });

        expect(response.statusCode).toBe(404);
    });

    it('should return 404 when user is not a member', async () => {
        const otherUserEmail = 'room_content_other_user@example.com';
        await userRepository.deleteMany({ email: otherUserEmail });
        await userRepository.create({
            username: 'room_content_other_user',
            email: otherUserEmail,
            passwordHash: await argon2.hash(testPasswordRaw),
            passwordHashVersion: 2,
            pqcPublicKey: 'other-key'
        });

        const loginResponse = await app.inject({
            method: 'POST',
            url: '/api/auth/login',
            payload: {
                email: otherUserEmail,
                argon2Hash: testPasswordRaw,
            },
        });
        const cookies: string[] = [].concat(loginResponse.headers['set-cookie'] as any);
        const otherTokenCookie = cookies.find(c => c.startsWith('token='));

        const response = await app.inject({
            method: 'GET',
            url: `/api/social/rooms/${roomId}`,
            headers: { cookie: otherTokenCookie },
        });

        expect(response.statusCode).toBe(404); // findByIdAndMember returns 404/Forbidden
    });
});
