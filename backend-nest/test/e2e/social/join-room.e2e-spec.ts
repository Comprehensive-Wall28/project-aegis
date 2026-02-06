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
import { Room, RoomDocument } from '../../../src/modules/social/schemas/room.schema';
import { Collection, CollectionDocument } from '../../../src/modules/social/schemas/collection.schema';

describe('Social (e2e) - POST /api/social/rooms/join', () => {
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
        roomModel = moduleFixture.get<Model<RoomDocument>>(getModelToken(Room.name, 'primary'));
        collectionModel = moduleFixture.get<Model<CollectionDocument>>(getModelToken(Collection.name, 'primary'));
    });

    afterAll(async () => {
        await app.close();
    });

    const testPasswordRaw = 'password123';
    const testUser = {
        username: 'join_test',
        email: 'join_test@example.com',
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
        await roomModel.deleteMany({ inviteCode: { $regex: /^join-test-invite-/ } });
        await collectionModel.deleteMany({});
    });

    async function createRoomWithInvite(ownerUserId: string): Promise<{ roomId: string; inviteCode: string }> {
        const room = await roomRepository.create({
            name: 'Test Room',
            description: '',
            icon: '',
            members: [{
                userId: new Types.ObjectId(ownerUserId),
                role: 'owner',
                encryptedRoomKey: 'owner-encrypted-key'
            }]
        } as any);

        const inviteCode = `join-test-invite-${new Types.ObjectId().toString()}`;
        await roomRepository.updateInviteCode(room._id.toString(), inviteCode);

        await collectionRepository.create({
            roomId: room._id,
            name: '',
            type: 'links'
        } as any);

        return { roomId: room._id.toString(), inviteCode };
    }

    async function createRoomWithDifferentOwner(): Promise<{ roomId: string; inviteCode: string }> {
        const ownerUser = {
            username: 'room_owner',
            email: 'room_owner@example.com',
        };
        await userRepository.deleteMany({ email: ownerUser.email });
        const owner = await userRepository.create({
            username: ownerUser.username,
            email: ownerUser.email,
            passwordHash: await argon2.hash(testPasswordRaw),
            passwordHashVersion: 2,
            pqcPublicKey: 'owner-pqc-key'
        });

        const room = await roomRepository.create({
            name: 'Test Room',
            description: '',
            icon: '',
            members: [{
                userId: owner._id,
                role: 'owner',
                encryptedRoomKey: 'owner-encrypted-key'
            }]
        } as any);

        const inviteCode = `join-test-invite-${new Types.ObjectId().toString()}`;
        await roomRepository.updateInviteCode(room._id.toString(), inviteCode);

        await collectionRepository.create({
            roomId: room._id,
            name: '',
            type: 'links'
        } as any);

        return { roomId: room._id.toString(), inviteCode };
    }

    it('should join a room with valid invite code', async () => {
        const { inviteCode } = await createRoomWithDifferentOwner();

        const response = await app.inject({
            method: 'POST',
            url: '/api/social/rooms/join',
            headers: { cookie: tokenCookie },
            payload: {
                inviteCode,
                encryptedRoomKey: 'new-member-encrypted-key'
            },
        });

        expect(response.statusCode).toBe(200);
        const body = JSON.parse(response.payload);
        expect(body.message).toBe('Successfully joined room');
        expect(body.roomId).toBeDefined();

        const room = await roomRepository.findById(body.roomId);
        expect(room?.members.length).toBe(2);
        const newMember = room?.members.find(m => m.userId.toString() === userId);
        expect(newMember?.role).toBe('member');
    });

    it('should return 400 for missing invite code', async () => {
        const response = await app.inject({
            method: 'POST',
            url: '/api/social/rooms/join',
            headers: { cookie: tokenCookie },
            payload: {
                encryptedRoomKey: 'encrypted-key'
            },
        });

        expect(response.statusCode).toBe(400);
    });

    it('should return 400 for missing encrypted room key', async () => {
        const { inviteCode } = await createRoomWithInvite(userId);

        const response = await app.inject({
            method: 'POST',
            url: '/api/social/rooms/join',
            headers: { cookie: tokenCookie },
            payload: {
                inviteCode
            },
        });

        expect(response.statusCode).toBe(400);
    });

    it('should return 404 for invalid invite code', async () => {
        const response = await app.inject({
            method: 'POST',
            url: '/api/social/rooms/join',
            headers: { cookie: tokenCookie },
            payload: {
                inviteCode: 'invalid-invite-code',
                encryptedRoomKey: 'encrypted-key'
            },
        });

        expect(response.statusCode).toBe(404);
    });

    it('should return 400 if already a member', async () => {
        const { inviteCode } = await createRoomWithInvite(userId);

        await app.inject({
            method: 'POST',
            url: '/api/social/rooms/join',
            headers: { cookie: tokenCookie },
            payload: {
                inviteCode,
                encryptedRoomKey: 'encrypted-key'
            },
        });

        const response = await app.inject({
            method: 'POST',
            url: '/api/social/rooms/join',
            headers: { cookie: tokenCookie },
            payload: {
                inviteCode,
                encryptedRoomKey: 'another-key'
            },
        });

        expect(response.statusCode).toBe(400);
        const body = JSON.parse(response.payload);
        expect(body.message).toBe('Already a member of this room');
    });

    it('should return 401 when not authenticated', async () => {
        const { inviteCode } = await createRoomWithInvite(userId);

        const response = await app.inject({
            method: 'POST',
            url: '/api/social/rooms/join',
            payload: {
                inviteCode,
                encryptedRoomKey: 'encrypted-key'
            },
        });

        expect(response.statusCode).toBe(401);
    });

    it('should allow different users to join same room', async () => {
        const { inviteCode, roomId } = await createRoomWithDifferentOwner();

        const response = await app.inject({
            method: 'POST',
            url: '/api/social/rooms/join',
            headers: { cookie: tokenCookie },
            payload: {
                inviteCode,
                encryptedRoomKey: 'user2-encrypted-key'
            },
        });

        expect(response.statusCode).toBe(200);

        const room = await roomRepository.findById(roomId);
        expect(room?.members.length).toBe(2);
    });
});
