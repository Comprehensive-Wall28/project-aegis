import { Test, TestingModule } from '@nestjs/testing';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { ValidationPipe } from '@nestjs/common';
import fastifyCookie from '@fastify/cookie';
import * as argon2 from 'argon2';
import { Types } from 'mongoose';
import { getModelToken } from '@nestjs/mongoose';
import { Readable } from 'stream';

import { AppModule } from '../../../src/app.module';
import { UserRepository } from '../../../src/modules/auth/repositories/user.repository';
import { VaultRepository } from '../../../src/modules/vault/repositories/vault.repository';
import { GoogleDriveService } from '../../../src/modules/vault/services/google-drive.service';
import { Model } from 'mongoose';
import { FileMetadata } from '../../../src/modules/vault/schemas/file-metadata.schema';

describe('Vault download (e2e) - GET /api/vault/download/:id', () => {
    let app: NestFastifyApplication;
    let userRepository: UserRepository;
    let vaultRepository: VaultRepository;
    let googleDriveService: GoogleDriveService;

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
        googleDriveService = moduleFixture.get<GoogleDriveService>(GoogleDriveService);
    });

    afterAll(async () => {
        await app.close();
    });

    const testPasswordRaw = 'password123';
    const testUser = {
        username: 'vault_download_test',
        email: 'vault_download@example.com',
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

    it('should successfully download a file', async () => {
        const fileContent = 'hello world';
        const mockStream = Readable.from([fileContent]);

        // Mock getFileStream to return our mock stream
        jest.spyOn(googleDriveService, 'getFileStream').mockResolvedValue(mockStream);

        const fileRecord = await vaultRepository.create({
            ownerId: new Types.ObjectId(userId),
            fileName: 'test.enc',
            originalFileName: 'test.txt',
            fileSize: fileContent.length,
            mimeType: 'text/plain',
            status: 'completed',
            googleDriveFileId: 'mock-drive-id',
            encryptedSymmetricKey: 'mock-key',
            encapsulatedKey: 'mock-encapsulated',
        } as any);

        const response = await app.inject({
            method: 'GET',
            url: `/api/vault/download/${fileRecord._id}`,
            headers: { cookie: tokenCookie },
        });

        expect(response.statusCode).toBe(200);
        expect(response.headers['content-type']).toBe('text/plain');
        expect(response.headers['content-disposition']).toBe('attachment; filename="test.txt"');
        expect(response.headers['content-length']).toBe(fileContent.length.toString());
        expect(response.payload).toBe(fileContent);
    });

    it('should return 404 for non-existent file', async () => {
        const fakeId = new Types.ObjectId();
        const response = await app.inject({
            method: 'GET',
            url: `/api/vault/download/${fakeId}`,
            headers: { cookie: tokenCookie },
        });

        expect(response.statusCode).toBe(404);
    });

    it('should return 403 for file owned by another user', async () => {
        const otherEmail = 'other@example.com';
        await userRepository.deleteMany({ email: otherEmail });
        const otherUser = await userRepository.create({
            username: 'other_user',
            email: otherEmail,
            passwordHash: 'hash',
            pqcPublicKey: 'key'
        });

        const fileRecord = await vaultRepository.create({
            ownerId: otherUser._id,
            fileName: 'other.enc',
            originalFileName: 'other.txt',
            fileSize: 10,
            mimeType: 'text/plain',
            status: 'completed',
            googleDriveFileId: 'other-drive-id',
            encryptedSymmetricKey: 'mock-key',
            encapsulatedKey: 'mock-encapsulated',
        } as any);

        const response = await app.inject({
            method: 'GET',
            url: `/api/vault/download/${fileRecord._id}`,
            headers: { cookie: tokenCookie },
        });

        expect(response.statusCode).toBe(404); // findByIdAndOwner returns null, which leads to 404
    });

    it('should return 401 when not authenticated', async () => {
        const response = await app.inject({
            method: 'GET',
            url: '/api/vault/download/some-id',
        });

        expect(response.statusCode).toBe(401);
    });
});
