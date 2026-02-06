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
import { LinkCommentRepository } from '../../../src/modules/social/repositories/link-comment.repository';
import { LinkViewRepository } from '../../../src/modules/social/repositories/link-view.repository';
import { ReaderAnnotationRepository } from '../../../src/modules/social/repositories/reader-annotation.repository';
import { Room, RoomDocument } from '../../../src/modules/social/schemas/room.schema';
import { Collection, CollectionDocument } from '../../../src/modules/social/schemas/collection.schema';
import { LinkPost, LinkPostDocument } from '../../../src/modules/social/schemas/link-post.schema';
import { LinkComment, LinkCommentDocument } from '../../../src/modules/social/schemas/link-comment.schema';
import { LinkView, LinkViewDocument } from '../../../src/modules/social/schemas/link-view.schema';
import { ReaderAnnotation, ReaderAnnotationDocument } from '../../../src/modules/social/schemas/reader-annotation.schema';

describe('Social (e2e) - DELETE /api/social/rooms/:roomId', () => {
    let app: NestFastifyApplication;
    let userRepository: UserRepository;
    let roomRepository: RoomRepository;
    let collectionRepository: CollectionRepository;
    let linkPostRepository: LinkPostRepository;
    let linkCommentRepository: LinkCommentRepository;
    let linkViewRepository: LinkViewRepository;
    let readerAnnotationRepository: ReaderAnnotationRepository;
    let roomModel: Model<RoomDocument>;
    let collectionModel: Model<CollectionDocument>;
    let linkPostModel: Model<LinkPostDocument>;
    let linkCommentModel: Model<LinkCommentDocument>;
    let linkViewModel: Model<LinkViewDocument>;
    let readerAnnotationModel: Model<ReaderAnnotationDocument>;

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
        linkCommentRepository = moduleFixture.get<LinkCommentRepository>(LinkCommentRepository);
        linkViewRepository = moduleFixture.get<LinkViewRepository>(LinkViewRepository);
        readerAnnotationRepository = moduleFixture.get<ReaderAnnotationRepository>(ReaderAnnotationRepository);
        roomModel = moduleFixture.get<Model<RoomDocument>>(getModelToken(Room.name, 'primary'));
        collectionModel = moduleFixture.get<Model<CollectionDocument>>(getModelToken(Collection.name, 'primary'));
        linkPostModel = moduleFixture.get<Model<LinkPostDocument>>(getModelToken(LinkPost.name, 'primary'));
        linkCommentModel = moduleFixture.get<Model<LinkCommentDocument>>(getModelToken(LinkComment.name, 'primary'));
        linkViewModel = moduleFixture.get<Model<LinkViewDocument>>(getModelToken(LinkView.name, 'primary'));
        readerAnnotationModel = moduleFixture.get<Model<ReaderAnnotationDocument>>(getModelToken(ReaderAnnotation.name, 'primary'));
    });

    afterAll(async () => {
        await app.close();
    });

    const testPasswordRaw = 'password123';
    const testUser = {
        username: 'delete_test',
        email: 'delete_test@example.com',
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
    });

    beforeEach(async () => {
        await roomModel.deleteMany({});
        await collectionModel.deleteMany({});
        await linkPostModel.deleteMany({});
        await linkCommentModel.deleteMany({});
        await linkViewModel.deleteMany({});
        await readerAnnotationModel.deleteMany({});
    });

    async function createRoom(userId: string, role: 'owner' | 'admin' | 'member' = 'owner'): Promise<string> {
        const room = await roomRepository.create({
            name: 'Test Room',
            description: '',
            icon: '',
            members: [{
                userId: new Types.ObjectId(userId),
                role,
                encryptedRoomKey: 'encrypted-key'
            }]
        } as any);

        await collectionRepository.create({
            roomId: room._id,
            name: '',
            type: 'links'
        } as any);

        return room._id.toString();
    }

    async function createSecondUser(): Promise<{ userId: string; tokenCookie: string }> {
        const secondUser = {
            username: 'delete_test_2',
            email: 'delete_test_2@example.com',
        };
        await userRepository.deleteMany({ email: secondUser.email });
        const user = await userRepository.create({
            username: secondUser.username,
            email: secondUser.email,
            passwordHash: await argon2.hash(testPasswordRaw),
            passwordHashVersion: 2,
            pqcPublicKey: 'test-pqc-key-2'
        });

        const loginResponse = await app.inject({
            method: 'POST',
            url: '/api/auth/login',
            payload: {
                email: secondUser.email,
                argon2Hash: testPasswordRaw,
            },
        });
        const cookies: string[] = [].concat(loginResponse.headers['set-cookie'] as any);
        const tokenCookie = cookies.find(c => c.startsWith('token='));

        return { userId: user._id.toString(), tokenCookie: tokenCookie || '' };
    }

    it('should delete a room successfully as owner', async () => {
        const roomId = await createRoom(userId, 'owner');

        const response = await app.inject({
            method: 'DELETE',
            url: `/api/social/rooms/${roomId}`,
            headers: { cookie: tokenCookie },
        });

        expect(response.statusCode).toBe(200);
        const body = JSON.parse(response.payload);
        expect(body.message).toBe('Successfully deleted room');

        const room = await roomRepository.findById(roomId);
        expect(room).toBeNull();

        const collections = await collectionRepository.findByRoom(roomId);
        expect(collections.length).toBe(0);
    });

    it('should cascade delete collections when deleting room', async () => {
        const room = await roomRepository.create({
            name: 'Room with Collections',
            description: '',
            icon: '',
            members: [{
                userId: new Types.ObjectId(userId),
                role: 'owner',
                encryptedRoomKey: 'encrypted-key'
            }]
        } as any);

        const collection1 = await collectionRepository.create({
            roomId: room._id,
            name: 'Collection 1',
            type: 'links'
        } as any);

        const collection2 = await collectionRepository.create({
            roomId: room._id,
            name: 'Collection 2',
            type: 'links'
        } as any);

        const response = await app.inject({
            method: 'DELETE',
            url: `/api/social/rooms/${room._id.toString()}`,
            headers: { cookie: tokenCookie },
        });

        expect(response.statusCode).toBe(200);

        const collections = await collectionRepository.findMany({
            roomId: { $eq: room._id }
        } as any);
        expect(collections.length).toBe(0);
    });

    it('should return 404 for non-existent room', async () => {
        const fakeRoomId = new Types.ObjectId().toString();

        const response = await app.inject({
            method: 'DELETE',
            url: `/api/social/rooms/${fakeRoomId}`,
            headers: { cookie: tokenCookie },
        });

        expect(response.statusCode).toBe(404);
    });

    it('should return 404 if user is not a member of the room', async () => {
        const room = await roomRepository.create({
            name: 'Other User Room',
            description: '',
            icon: '',
            members: [{
                userId: new Types.ObjectId(),
                role: 'owner',
                encryptedRoomKey: 'other-key'
            }]
        } as any);

        await collectionRepository.create({
            roomId: room._id,
            name: '',
            type: 'links'
        } as any);

        const response = await app.inject({
            method: 'DELETE',
            url: `/api/social/rooms/${room._id.toString()}`,
            headers: { cookie: tokenCookie },
        });

        expect(response.statusCode).toBe(404);
    });

    it('should return 403 if user is not an owner', async () => {
        const room = await roomRepository.create({
            name: 'Admin Room',
            description: '',
            icon: '',
            members: [{
                userId: new Types.ObjectId(userId),
                role: 'admin',
                encryptedRoomKey: 'admin-key'
            }]
        } as any);

        await collectionRepository.create({
            roomId: room._id,
            name: '',
            type: 'links'
        } as any);

        const response = await app.inject({
            method: 'DELETE',
            url: `/api/social/rooms/${room._id.toString()}`,
            headers: { cookie: tokenCookie },
        });

        expect(response.statusCode).toBe(403);
        const body = JSON.parse(response.payload);
        expect(body.message).toBe('Only room owners can delete rooms');
    });

    it('should return 403 if user is a member but not owner', async () => {
        const room = await roomRepository.create({
            name: 'Member Room',
            description: '',
            icon: '',
            members: [{
                userId: new Types.ObjectId(userId),
                role: 'member',
                encryptedRoomKey: 'member-key'
            }]
        } as any);

        await collectionRepository.create({
            roomId: room._id,
            name: '',
            type: 'links'
        } as any);

        const response = await app.inject({
            method: 'DELETE',
            url: `/api/social/rooms/${room._id.toString()}`,
            headers: { cookie: tokenCookie },
        });

        expect(response.statusCode).toBe(403);
    });

    it('should return 401 when not authenticated', async () => {
        const roomId = await createRoom(userId);

        const response = await app.inject({
            method: 'DELETE',
            url: `/api/social/rooms/${roomId}`,
        });

        expect(response.statusCode).toBe(401);
    });

    it('should allow any owner to delete room with multiple owners', async () => {
        const { userId: owner2Id, tokenCookie: owner2Token } = await createSecondUser();

        const room = await roomRepository.create({
            name: 'Multi-Owner Room',
            description: '',
            icon: '',
            members: [
                {
                    userId: new Types.ObjectId(userId),
                    role: 'owner',
                    encryptedRoomKey: 'owner1-key'
                },
                {
                    userId: new Types.ObjectId(owner2Id),
                    role: 'owner',
                    encryptedRoomKey: 'owner2-key'
                }
            ]
        } as any);

        await collectionRepository.create({
            roomId: room._id,
            name: '',
            type: 'links'
        } as any);

        const response = await app.inject({
            method: 'DELETE',
            url: `/api/social/rooms/${room._id.toString()}`,
            headers: { cookie: owner2Token },
        });

        expect(response.statusCode).toBe(200);
        const body = JSON.parse(response.payload);
        expect(body.message).toBe('Successfully deleted room');
    });
});
