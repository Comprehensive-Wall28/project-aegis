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
import { FolderRepository } from '../../../src/modules/folders/repositories/folder.repository';
import { Folder, FolderDocument } from '../../../src/modules/folders/schemas/folder.schema';

describe('Folders (e2e) - GET /api/folders', () => {
    let app: NestFastifyApplication;
    let userRepository: UserRepository;
    let folderRepository: FolderRepository;
    let folderModel: Model<FolderDocument>;

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
        folderRepository = moduleFixture.get<FolderRepository>(FolderRepository);
        folderModel = moduleFixture.get<Model<FolderDocument>>(getModelToken(Folder.name, 'primary'));
    });

    afterAll(async () => {
        await app.close();
    });

    const testPasswordRaw = 'password123';
    const testUser = {
        username: 'folders_test',
        email: 'folders_test@example.com',
    };
    let userId: string;
    let tokenCookie: string | undefined;

    beforeAll(async () => {
        // Cleanup and create user
        await userRepository.deleteMany({ email: testUser.email });
        const user = await userRepository.create({
            username: testUser.username,
            email: testUser.email,
            passwordHash: await argon2.hash(testPasswordRaw),
            passwordHashVersion: 2,
            pqcPublicKey: 'test-pqc-key'
        });
        userId = user._id.toString();

        // Login to get token
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
        // Cleanup folders
        await folderModel.deleteMany({ ownerId: new Types.ObjectId(userId) });
    });

    it('should return empty list when no folders exist at root', async () => {
        const response = await app.inject({
            method: 'GET',
            url: '/api/folders',
            headers: { cookie: tokenCookie },
        });

        expect(response.statusCode).toBe(200);
        const body = JSON.parse(response.payload);
        expect(Array.isArray(body)).toBe(true);
        expect(body.length).toBe(0);
    });

    it('should return empty list when parentId=null', async () => {
        const response = await app.inject({
            method: 'GET',
            url: '/api/folders?parentId=null',
            headers: { cookie: tokenCookie },
        });

        expect(response.statusCode).toBe(200);
        const body = JSON.parse(response.payload);
        expect(Array.isArray(body)).toBe(true);
        expect(body.length).toBe(0);
    });

    it('should return root folders', async () => {
        // Create some root folders
        await folderModel.create({
            ownerId: new Types.ObjectId(userId),
            name: 'Root Folder 1',
            parentId: null as any,
            encryptedSessionKey: 'mock-key-1',
            isShared: false,
        } as any);
        await folderModel.create({
            ownerId: new Types.ObjectId(userId),
            name: 'Root Folder 2',
            parentId: null as any,
            encryptedSessionKey: 'mock-key-2',
            isShared: false,
        } as any);

        const response = await app.inject({
            method: 'GET',
            url: '/api/folders',
            headers: { cookie: tokenCookie },
        });

        const body = JSON.parse(response.payload);
        expect(response.statusCode).toBe(200);
        expect(Array.isArray(body)).toBe(true);
        expect(body.length).toBe(2);
        expect(body[0].name).toBeDefined();
        expect(body[0].encryptedSessionKey).toBeDefined();
    });

    it('should return sorted folders by name', async () => {
        await folderModel.create({
            ownerId: new Types.ObjectId(userId),
            name: 'Zebra',
            parentId: null as any,
            encryptedSessionKey: 'mock-key-1',
            isShared: false,
        } as any);
        await folderModel.create({
            ownerId: new Types.ObjectId(userId),
            name: 'Apple',
            parentId: null as any,
            encryptedSessionKey: 'mock-key-2',
            isShared: false,
        } as any);

        const response = await app.inject({
            method: 'GET',
            url: '/api/folders',
            headers: { cookie: tokenCookie },
        });

        const body = JSON.parse(response.payload);
        expect(response.statusCode).toBe(200);
        expect(body[0].name).toBe('Apple');
        expect(body[1].name).toBe('Zebra');
    });

    it('should return subfolders when valid parentId is provided', async () => {
        // Create parent folder
        const parentFolder = await folderModel.create({
            ownerId: new Types.ObjectId(userId),
            name: 'Parent',
            parentId: null as any,
            encryptedSessionKey: 'mock-key-parent',
            isShared: false,
        } as any) as any;

        // Create subfolders
        await folderModel.create({
            ownerId: new Types.ObjectId(userId),
            name: 'Subfolder 1',
            parentId: parentFolder._id,
            encryptedSessionKey: 'mock-key-sub1',
            isShared: false,
        } as any);
        await folderModel.create({
            ownerId: new Types.ObjectId(userId),
            name: 'Subfolder 2',
            parentId: parentFolder._id,
            encryptedSessionKey: 'mock-key-sub2',
            isShared: false,
        } as any);

        const response = await app.inject({
            method: 'GET',
            url: `/api/folders?parentId=${parentFolder._id.toString()}`,
            headers: { cookie: tokenCookie },
        });

        const body = JSON.parse(response.payload);
        expect(response.statusCode).toBe(200);
        expect(Array.isArray(body)).toBe(true);
        expect(body.length).toBe(2);
        expect(body[0].name).toBe('Subfolder 1');
        expect(body[1].name).toBe('Subfolder 2');
    });

    it('should return 400 for invalid parentId format', async () => {
        const response = await app.inject({
            method: 'GET',
            url: '/api/folders?parentId=invalid-id',
            headers: { cookie: tokenCookie },
        });

        expect(response.statusCode).toBe(400);
        const body = JSON.parse(response.payload);
        expect(body.message).toContain('Invalid folder ID format');
    });

    it('should return 404 when parentId does not exist', async () => {
        const fakeId = new Types.ObjectId().toString();
        const response = await app.inject({
            method: 'GET',
            url: `/api/folders?parentId=${fakeId}`,
            headers: { cookie: tokenCookie },
        });

        expect(response.statusCode).toBe(404);
        const body = JSON.parse(response.payload);
        expect(body.message).toContain('Parent folder not found');
    });

    it('should return 403 when accessing subfolder of another user', async () => {
        // Create another user and their folder
        const otherUserEmail = 'other_folders@example.com';
        await userRepository.deleteMany({ email: otherUserEmail });

        const otherUser = await userRepository.create({
            username: 'other_folders_user',
            email: otherUserEmail,
            passwordHash: await argon2.hash(testPasswordRaw),
            passwordHashVersion: 2,
            pqcPublicKey: 'test-pqc-key-other'
        });

        const otherUserFolder = await folderModel.create({
            ownerId: otherUser._id,
            name: 'Other User Folder',
            parentId: null as any,
            encryptedSessionKey: 'mock-key-other',
            isShared: false,
        } as any) as any;

        const response = await app.inject({
            method: 'GET',
            url: `/api/folders?parentId=${otherUserFolder._id.toString()}`,
            headers: { cookie: tokenCookie },
        });

        expect(response.statusCode).toBe(403);
        const body = JSON.parse(response.payload);
        expect(body.message).toContain('Access denied');

        // Cleanup
        await userRepository.deleteById(otherUser._id.toString());
        await folderModel.deleteOne({ _id: otherUserFolder._id });
    });

    it('should return 401 when not authenticated', async () => {
        const response = await app.inject({
            method: 'GET',
            url: '/api/folders',
        });

        expect(response.statusCode).toBe(401);
    });
});
