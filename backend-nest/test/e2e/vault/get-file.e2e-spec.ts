import { Test, TestingModule } from '@nestjs/testing';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { ValidationPipe } from '@nestjs/common';
import fastifyCookie from '@fastify/cookie';
import * as argon2 from 'argon2';
import { Types } from 'mongoose';

import { AppModule } from '../../../src/app.module';
import { UserRepository } from '../../../src/modules/auth/repositories/user.repository';
import { VaultRepository } from '../../../src/modules/vault/repositories/vault.repository';

describe('Vault get file (e2e) - GET /api/vault/files/:id', () => {
    let app: NestFastifyApplication;
    let userRepository: UserRepository;
    let vaultRepository: VaultRepository;

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
    });

    afterAll(async () => {
        await app.close();
    });

    const testPasswordRaw = 'password123';
    const testUser = {
        username: 'vault_get_test',
        email: 'vault_get@example.com',
    };
    let userId: string;
    let tokenCookie: string | undefined;

    const otherUser = {
        username: 'vault_get_other',
        email: 'vault_get_other@example.com',
    };
    let otherUserId: string;

    beforeAll(async () => {
        // Create test user
        await userRepository.deleteMany({ email: { $in: [testUser.email, otherUser.email] } });
        const user = await userRepository.create({
            username: testUser.username,
            email: testUser.email,
            passwordHash: await argon2.hash(testPasswordRaw),
            passwordHashVersion: 2,
            pqcPublicKey: 'test-pqc-key'
        });
        userId = user._id.toString();

        // Create other user
        const other = await userRepository.create({
            username: otherUser.username,
            email: otherUser.email,
            passwordHash: await argon2.hash(testPasswordRaw),
            passwordHashVersion: 2,
            pqcPublicKey: 'test-pqc-key'
        });
        otherUserId = other._id.toString();

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
        await vaultRepository.deleteMany({ ownerId: { $in: [userId, otherUserId] } });
    });

    it('should return 401 if not authenticated', async () => {
        const response = await app.inject({
            method: 'GET',
            url: '/api/vault/files/someid',
        });
        expect(response.statusCode).toBe(401);
    });

    it('should return 400 if ID is invalid', async () => {
        const response = await app.inject({
            method: 'GET',
            url: '/api/vault/files/invalid-id',
            headers: { cookie: tokenCookie },
        });
        expect(response.statusCode).toBe(400);
        const body = JSON.parse(response.payload);
        expect(body.message).toBe('Invalid file ID format');
    });

    it('should return 404 if file does not exist', async () => {
        const fakeId = new Types.ObjectId().toString();
        const response = await app.inject({
            method: 'GET',
            url: `/api/vault/files/${fakeId}`,
            headers: { cookie: tokenCookie },
        });
        expect(response.statusCode).toBe(404);
    });

    it('should return 404 if file belongs to another user', async () => {
        const file = await vaultRepository.create({
            ownerId: new Types.ObjectId(otherUserId),
            fileName: 'other.enc',
            originalFileName: 'other.txt',
            fileSize: 100,
            mimeType: 'text/plain',
            status: 'completed',
            encryptedSymmetricKey: 'mock-key',
            encapsulatedKey: 'mock-encapsulated',
        } as any);

        const response = await app.inject({
            method: 'GET',
            url: `/api/vault/files/${file._id}`,
            headers: { cookie: tokenCookie },
        });
        expect(response.statusCode).toBe(404);
    });

    it('should return file if it exists and belongs to user', async () => {
        const file = await vaultRepository.create({
            ownerId: new Types.ObjectId(userId),
            fileName: 'mine.enc',
            originalFileName: 'mine.txt',
            fileSize: 100,
            mimeType: 'text/plain',
            status: 'completed',
            encryptedSymmetricKey: 'mock-key',
            encapsulatedKey: 'mock-encapsulated',
        } as any);

        const response = await app.inject({
            method: 'GET',
            url: `/api/vault/files/${file._id}`,
            headers: { cookie: tokenCookie },
        });

        expect(response.statusCode).toBe(200);
        const body = JSON.parse(response.payload);
        expect(body.originalFileName).toBe('mine.txt');
        expect(body._id).toBe(file._id.toString());
    });
});
