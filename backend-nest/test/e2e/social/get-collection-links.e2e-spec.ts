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

describe('Social (e2e) - GET /api/social/rooms/:roomId/collections/:collectionId/links', () => {
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
        username: 'get_collection_links_test',
        email: 'get_collection_links_test@example.com',
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
            description: '',
            icon: '',
            members: [{
                userId: new Types.ObjectId(userId),
                role: 'owner',
                encryptedRoomKey: 'test-encrypted-key'
            }]
        } as any);
        roomId = room._id.toString();

        const collection = await collectionRepository.create({
            roomId: room._id,
            name: 'Test Collection',
            order: 0,
            type: 'links'
        } as any);
        collectionId = collection._id.toString();
    });

    beforeEach(async () => {
        await linkPostModel.deleteMany({ collectionId: new Types.ObjectId(collectionId) });
        await linkViewModel.deleteMany({ roomId: new Types.ObjectId(roomId) });
        await linkCommentModel.deleteMany({});
    });

    it('should return empty list when no links exist', async () => {
        const response = await app.inject({
            method: 'GET',
            url: `/api/social/rooms/${roomId}/collections/${collectionId}/links`,
            headers: { cookie: tokenCookie },
        });

        expect(response.statusCode).toBe(200);
        const body = JSON.parse(response.payload);
        expect(body.links).toEqual([]);
        expect(body.totalCount).toBe(0);
        expect(body.hasMore).toBe(false);
        expect(body.viewedLinkIds).toEqual([]);
        expect(body.commentCounts).toEqual({});
    });

    it('should return links with all expected fields', async () => {
        const link = await linkPostModel.create({
            collectionId: new Types.ObjectId(collectionId),
            userId: new Types.ObjectId(userId),
            url: 'https://example.com',
            previewData: {
                title: 'Example',
                description: 'A test link',
                image: 'https://example.com/image.png',
                favicon: 'https://example.com/favicon.ico',
                scrapeStatus: 'success'
            }
        });

        const response = await app.inject({
            method: 'GET',
            url: `/api/social/rooms/${roomId}/collections/${collectionId}/links`,
            headers: { cookie: tokenCookie },
        });

        expect(response.statusCode).toBe(200);
        const body = JSON.parse(response.payload);
        expect(body.links.length).toBe(1);
        expect(body.links[0]._id).toBe(link._id.toString());
        expect(body.links[0].url).toBe('https://example.com');
        expect(body.links[0].previewData.title).toBe('Example');
        expect(body.totalCount).toBe(1);
        expect(body.hasMore).toBe(false);
    });

    it('should return viewed link IDs', async () => {
        const link = await linkPostModel.create({
            collectionId: new Types.ObjectId(collectionId),
            userId: new Types.ObjectId(userId),
            url: 'https://example.com'
        });

        await linkViewModel.create({
            userId: new Types.ObjectId(userId),
            linkId: link._id,
            roomId: new Types.ObjectId(roomId)
        });

        const response = await app.inject({
            method: 'GET',
            url: `/api/social/rooms/${roomId}/collections/${collectionId}/links`,
            headers: { cookie: tokenCookie },
        });

        expect(response.statusCode).toBe(200);
        const body = JSON.parse(response.payload);
        expect(body.viewedLinkIds).toContain(link._id.toString());
    });

    it('should return comment counts', async () => {
        const link = await linkPostModel.create({
            collectionId: new Types.ObjectId(collectionId),
            userId: new Types.ObjectId(userId),
            url: 'https://example.com'
        });

        await linkCommentModel.create({
            linkId: link._id,
            userId: new Types.ObjectId(userId),
            encryptedContent: 'test comment 1'
        });
        await linkCommentModel.create({
            linkId: link._id,
            userId: new Types.ObjectId(userId),
            encryptedContent: 'test comment 2'
        });

        const response = await app.inject({
            method: 'GET',
            url: `/api/social/rooms/${roomId}/collections/${collectionId}/links`,
            headers: { cookie: tokenCookie },
        });

        expect(response.statusCode).toBe(200);
        const body = JSON.parse(response.payload);
        expect(body.commentCounts[link._id.toString()]).toBe(2);
    });

    it('should support pagination with limit', async () => {
        for (let i = 0; i < 15; i++) {
            await linkPostModel.create({
                collectionId: new Types.ObjectId(collectionId),
                userId: new Types.ObjectId(userId),
                url: `https://example.com/${i}`
            });
        }

        const response = await app.inject({
            method: 'GET',
            url: `/api/social/rooms/${roomId}/collections/${collectionId}/links?limit=10`,
            headers: { cookie: tokenCookie },
        });

        expect(response.statusCode).toBe(200);
        const body = JSON.parse(response.payload);
        expect(body.links.length).toBe(10);
        expect(body.totalCount).toBe(15);
        expect(body.hasMore).toBe(true);
    });

    it('should support cursor-based pagination', async () => {
        const links = [];
        for (let i = 0; i < 5; i++) {
            const link = await linkPostModel.create({
                collectionId: new Types.ObjectId(collectionId),
                userId: new Types.ObjectId(userId),
                url: `https://example.com/${i}`
            });
            links.push(link);
            await new Promise(resolve => setTimeout(resolve, 10));
        }

        const firstPageResponse = await app.inject({
            method: 'GET',
            url: `/api/social/rooms/${roomId}/collections/${collectionId}/links?limit=3`,
            headers: { cookie: tokenCookie },
        });

        expect(firstPageResponse.statusCode).toBe(200);
        const firstPage = JSON.parse(firstPageResponse.payload);
        expect(firstPage.links.length).toBe(3);

        const lastLink = firstPage.links[firstPage.links.length - 1];
        const secondPageResponse = await app.inject({
            method: 'GET',
            url: `/api/social/rooms/${roomId}/collections/${collectionId}/links?limit=3&cursorCreatedAt=${lastLink.createdAt}&cursorId=${lastLink._id}`,
            headers: { cookie: tokenCookie },
        });

        expect(secondPageResponse.statusCode).toBe(200);
        const secondPage = JSON.parse(secondPageResponse.payload);
        expect(secondPage.links.length).toBe(2);
        expect(secondPage.hasMore).toBe(false);
    });

    it('should return 404 when room not found', async () => {
        const fakeRoomId = new Types.ObjectId().toString();
        const response = await app.inject({
            method: 'GET',
            url: `/api/social/rooms/${fakeRoomId}/collections/${collectionId}/links`,
            headers: { cookie: tokenCookie },
        });

        expect(response.statusCode).toBe(404);
    });

    it('should return 404 when collection not found', async () => {
        const fakeCollectionId = new Types.ObjectId().toString();
        const response = await app.inject({
            method: 'GET',
            url: `/api/social/rooms/${roomId}/collections/${fakeCollectionId}/links`,
            headers: { cookie: tokenCookie },
        });

        expect(response.statusCode).toBe(404);
    });

    it('should return 404 when collection belongs to different room', async () => {
        const otherRoom = await roomRepository.create({
            name: 'Other Room',
            description: '',
            icon: '',
            members: [{
                userId: new Types.ObjectId(userId),
                role: 'owner',
                encryptedRoomKey: 'test-key'
            }]
        } as any);

        const otherCollection = await collectionRepository.create({
            roomId: otherRoom._id,
            name: 'Other Collection',
            order: 0,
            type: 'links'
        } as any);

        const response = await app.inject({
            method: 'GET',
            url: `/api/social/rooms/${roomId}/collections/${otherCollection._id.toString()}/links`,
            headers: { cookie: tokenCookie },
        });

        expect(response.statusCode).toBe(404);
    });

    it('should return 401 when not authenticated', async () => {
        const response = await app.inject({
            method: 'GET',
            url: `/api/social/rooms/${roomId}/collections/${collectionId}/links`,
        });

        expect(response.statusCode).toBe(401);
    });

    it('should return 404 when not a room member', async () => {
        const otherEmail = 'other_get_collection_links_test@example.com';
        await userRepository.deleteMany({ email: otherEmail });

        const otherUser = await userRepository.create({
            username: 'other_user',
            email: otherEmail,
            passwordHash: await argon2.hash(testPasswordRaw),
            passwordHashVersion: 2,
            pqcPublicKey: 'test-pqc-key'
        });

        const loginResponse = await app.inject({
            method: 'POST',
            url: '/api/auth/login',
            payload: {
                email: otherEmail,
                argon2Hash: testPasswordRaw,
            },
        });
        const cookies: string[] = [].concat(loginResponse.headers['set-cookie'] as any);
        const otherTokenCookie = cookies.find(c => c.startsWith('token='));

        const response = await app.inject({
            method: 'GET',
            url: `/api/social/rooms/${roomId}/collections/${collectionId}/links`,
            headers: { cookie: otherTokenCookie },
        });

        expect(response.statusCode).toBe(404);
    });
});
