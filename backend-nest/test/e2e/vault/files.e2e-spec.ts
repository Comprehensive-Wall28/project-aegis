import { Test, TestingModule } from '@nestjs/testing';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { ValidationPipe } from '@nestjs/common';
import fastifyCookie from '@fastify/cookie';
import * as argon2 from 'argon2';
import { Types } from 'mongoose';
import { getModelToken } from '@nestjs/mongoose';

import { AppModule } from '../../../src/app.module';
import { UserRepository } from '../../../src/modules/auth/repositories/user.repository';
import { VaultRepository } from '../../../src/modules/vault/repositories/vault.repository';
import { Model } from 'mongoose';
import { Folder, FolderDocument } from '../../../src/modules/folders/schemas/folder.schema';
import { FileMetadata } from '../../../src/modules/vault/schemas/file-metadata.schema';

describe('Vault listing (e2e) - GET /api/vault/files', () => {
    let app: NestFastifyApplication;
    let userRepository: UserRepository;
    let vaultRepository: VaultRepository;
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
        vaultRepository = moduleFixture.get<VaultRepository>(VaultRepository);
        folderModel = moduleFixture.get<Model<FolderDocument>>(getModelToken(Folder.name, 'primary'));
    });

    afterAll(async () => {
        await app.close();
    });

    const testPasswordRaw = 'password123';
    const testUser = {
        username: 'vault_list_test',
        email: 'vault_list@example.com',
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
        // Cleanup files and folders
        await vaultRepository.deleteMany({ ownerId: userId });
        // Clean folders - we need the model directly or via repository
        // If we don't have FolderRepository, we can use the model
    });

    it('should return empty list when no files exist', async () => {
        const response = await app.inject({
            method: 'GET',
            url: '/api/vault/files',
            headers: { cookie: tokenCookie },
        });

        expect(response.statusCode).toBe(200);
        const body = JSON.parse(response.payload);
        expect(Array.isArray(body)).toBe(true);
        expect(body.length).toBe(0);
    });

    it('should return files at root level', async () => {
        // Create some files
        await vaultRepository.create({
            ownerId: new Types.ObjectId(userId),
            fileName: 'file1.enc',
            originalFileName: 'file1.txt',
            fileSize: 100,
            mimeType: 'text/plain',
            status: 'completed',
            encryptedSymmetricKey: 'mock-key',
            encapsulatedKey: 'mock-encapsulated',
        } as any);

        const response = await app.inject({
            method: 'GET',
            url: '/api/vault/files',
            headers: { cookie: tokenCookie },
        });

        const body = JSON.parse(response.payload);
        expect(response.statusCode).toBe(200);
        expect(Array.isArray(body)).toBe(true);
        expect(body.length).toBe(1);
        expect(body[0].originalFileName).toBe('file1.txt');
    });

    it('should filter by search query', async () => {
        await vaultRepository.create({
            ownerId: new Types.ObjectId(userId),
            fileName: 'file1.enc',
            originalFileName: 'apple.txt',
            fileSize: 100,
            mimeType: 'text/plain',
            status: 'completed',
            encryptedSymmetricKey: 'mock-key',
            encapsulatedKey: 'mock-encapsulated',
        } as any);
        await vaultRepository.create({
            ownerId: new Types.ObjectId(userId),
            fileName: 'file2.enc',
            originalFileName: 'banana.txt',
            fileSize: 100,
            mimeType: 'text/plain',
            status: 'completed',
            encryptedSymmetricKey: 'mock-key',
            encapsulatedKey: 'mock-encapsulated',
        } as any);

        const response = await app.inject({
            method: 'GET',
            url: '/api/vault/files',
            query: { search: 'apple' },
            headers: { cookie: tokenCookie },
        });

        const body = JSON.parse(response.payload);
        expect(response.statusCode).toBe(200);
        expect(Array.isArray(body)).toBe(true);
        expect(body.length).toBe(1);
        expect(body[0].originalFileName).toBe('apple.txt');
    });

    it('should handle pagination', async () => {
        for (let i = 0; i < 5; i++) {
            await vaultRepository.create({
                ownerId: new Types.ObjectId(userId),
                fileName: `file${i}.enc`,
                originalFileName: `file${i}.txt`,
                fileSize: 100,
                mimeType: 'text/plain',
                status: 'completed',
                encryptedSymmetricKey: 'mock-key',
                encapsulatedKey: 'mock-encapsulated',
            } as any);
            await new Promise(resolve => setTimeout(resolve, 100));
        }

        const response = await app.inject({
            method: 'GET',
            url: '/api/vault/files',
            query: { limit: '2' },
            headers: { cookie: tokenCookie },
        });

        const body = JSON.parse(response.payload);
        expect(response.statusCode).toBe(200);
        expect(body.items.length).toBe(2);
        expect(body.nextCursor).toBeDefined();

        const response2 = await app.inject({
            method: 'GET',
            url: '/api/vault/files',
            query: { limit: '2', cursor: body.nextCursor },
            headers: { cookie: tokenCookie },
        });

        const body2 = JSON.parse(response2.payload);
        expect(response2.statusCode).toBe(200);
        expect(body2.items.length).toBe(2);
    });
});
