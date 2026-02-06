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

describe('Social (e2e) - POST /api/social/rooms/:roomId/invite', () => {
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
        username: 'invite_test',
        email: 'invite_test@example.com',
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
        await roomModel.deleteMany({ 'members.userId': new Types.ObjectId(userId) });
        await collectionModel.deleteMany({});
    });

    async function createRoom(ownerUserId: string, role: 'owner' | 'admin' | 'member' = 'owner'): Promise<string> {
        const room = await roomRepository.create({
            name: 'Test Room',
            description: '',
            icon: '',
            members: [{
                userId: new Types.ObjectId(ownerUserId),
                role: role,
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

    it('should create an invite code for room owner', async () => {
        const roomId = await createRoom(userId);

        const response = await app.inject({
            method: 'POST',
            url: `/api/social/rooms/${roomId}/invite`,
            headers: { cookie: tokenCookie },
        });

        expect(response.statusCode).toBe(200);
        const body = JSON.parse(response.payload);
        expect(body.inviteCode).toBeDefined();
        expect(typeof body.inviteCode).toBe('string');
        expect(body.inviteCode.length).toBeGreaterThan(0);

        const room = await roomRepository.findById(roomId);
        expect(room?.inviteCode).toBe(body.inviteCode);
    });

    it('should create an invite code for room admin', async () => {
        const roomId = await createRoom(userId, 'admin');

        const response = await app.inject({
            method: 'POST',
            url: `/api/social/rooms/${roomId}/invite`,
            headers: { cookie: tokenCookie },
        });

        expect(response.statusCode).toBe(200);
        const body = JSON.parse(response.payload);
        expect(body.inviteCode).toBeDefined();
    });

    it('should return 403 for room member', async () => {
        const roomId = await createRoom(userId, 'member');

        const response = await app.inject({
            method: 'POST',
            url: `/api/social/rooms/${roomId}/invite`,
            headers: { cookie: tokenCookie },
        });

        expect(response.statusCode).toBe(403);
    });

    it('should return 404 for non-existent room', async () => {
        const fakeRoomId = new Types.ObjectId().toString();

        const response = await app.inject({
            method: 'POST',
            url: `/api/social/rooms/${fakeRoomId}/invite`,
            headers: { cookie: tokenCookie },
        });

        expect(response.statusCode).toBe(404);
    });

    it('should return 401 when not authenticated', async () => {
        const roomId = await createRoom(userId);

        const response = await app.inject({
            method: 'POST',
            url: `/api/social/rooms/${roomId}/invite`,
        });

        expect(response.statusCode).toBe(401);
    });

    it('should generate unique invite codes', async () => {
        const roomId = await createRoom(userId);

        const response1 = await app.inject({
            method: 'POST',
            url: `/api/social/rooms/${roomId}/invite`,
            headers: { cookie: tokenCookie },
        });

        const response2 = await app.inject({
            method: 'POST',
            url: `/api/social/rooms/${roomId}/invite`,
            headers: { cookie: tokenCookie },
        });

        expect(response1.statusCode).toBe(200);
        expect(response2.statusCode).toBe(200);

        const body1 = JSON.parse(response1.payload);
        const body2 = JSON.parse(response2.payload);

        expect(body1.inviteCode).not.toBe(body2.inviteCode);
    });
});
