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

describe('Social (e2e) - GET /api/social/invite/:inviteCode', () => {
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
        username: 'invite_info_test',
        email: 'invite_info_test@example.com',
    };
    let userId: string;

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
    });

    beforeEach(async () => {
        await roomModel.deleteMany({});
        await collectionModel.deleteMany({});
    });

    async function createRoomWithInvite(ownerUserId: string): Promise<{ roomId: string; inviteCode: string }> {
        const room = await roomRepository.create({
            name: 'Test Room Name',
            description: 'Test Room Description',
            icon: 'test-icon',
            members: [{
                userId: new Types.ObjectId(ownerUserId),
                role: 'owner',
                encryptedRoomKey: 'encrypted-key'
            }]
        } as any);

        await collectionRepository.create({
            roomId: room._id,
            name: '',
            type: 'links'
        } as any);

        const inviteCode = 'testInviteCode123';
        await roomRepository.updateInviteCode(room._id.toString(), inviteCode);

        return { roomId: room._id.toString(), inviteCode };
    }

    it('should return room info for valid invite code (public endpoint)', async () => {
        const { inviteCode } = await createRoomWithInvite(userId);

        const response = await app.inject({
            method: 'GET',
            url: `/api/social/invite/${inviteCode}`,
        });

        expect(response.statusCode).toBe(200);
        const body = JSON.parse(response.payload);
        expect(body.name).toBe('Test Room Name');
        expect(body.description).toBe('Test Room Description');
        expect(body.icon).toBe('test-icon');
    });

    it('should return 404 for invalid invite code', async () => {
        const response = await app.inject({
            method: 'GET',
            url: '/api/social/invite/invalidInviteCode',
        });

        expect(response.statusCode).toBe(404);
        const body = JSON.parse(response.payload);
        expect(body.message).toContain('Invite not found or expired');
    });

    it('should return 400 for empty invite code', async () => {
        const response = await app.inject({
            method: 'GET',
            url: '/api/social/invite/',
        });

        expect(response.statusCode).toBe(400);
    });

    it('should not require authentication', async () => {
        const { inviteCode } = await createRoomWithInvite(userId);

        const response = await app.inject({
            method: 'GET',
            url: `/api/social/invite/${inviteCode}`,
        });

        expect(response.statusCode).toBe(200);
    });

    it('should return empty strings for room with no description or icon', async () => {
        const room = await roomRepository.create({
            name: 'Minimal Room',
            description: '',
            icon: '',
            members: [{
                userId: new Types.ObjectId(userId),
                role: 'owner',
                encryptedRoomKey: 'encrypted-key'
            }]
        } as any);

        await collectionRepository.create({
            roomId: room._id,
            name: '',
            type: 'links'
        } as any);

        const inviteCode = 'minimalInvite';
        await roomRepository.updateInviteCode(room._id.toString(), inviteCode);

        const response = await app.inject({
            method: 'GET',
            url: `/api/social/invite/${inviteCode}`,
        });

        expect(response.statusCode).toBe(200);
        const body = JSON.parse(response.payload);
        expect(body.name).toBe('Minimal Room');
        expect(body.description).toBe('');
        expect(body.icon).toBe('');
    });
});
