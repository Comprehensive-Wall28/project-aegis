import { Test, TestingModule } from '@nestjs/testing';
import { ValidationPipe } from '@nestjs/common';
import {
    FastifyAdapter,
    NestFastifyApplication,
} from '@nestjs/platform-fastify';
import fastifyCookie from '@fastify/cookie';
import * as argon2 from 'argon2';
import { AppModule } from '../../../src/app.module';
import { GoogleDriveService } from '../../../src/modules/vault/services/google-drive.service';
import { UserRepository } from '../../../src/modules/auth/repositories/user.repository';
import { VaultRepository } from '../../../src/modules/vault/repositories/vault.repository';

describe('VaultModule (e2e) - PUT /api/vault/upload-chunk', () => {
    let app: NestFastifyApplication;
    let userRepository: UserRepository;
    let vaultRepository: VaultRepository;
    let tokenCookie: string;
    let testUserId: string;
    let testFileId: string;

    const testUser = {
        username: 'chunk_test_user',
        email: 'chunk_test@example.com',
        password: 'password123',
    };

    const mockGoogleDriveService = {
        appendChunk: jest.fn(),
        finalizeUpload: jest.fn(),
        initiateUpload: jest.fn(), // Needed for other potential interactions
    };

    beforeAll(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [AppModule],
        })
            .overrideProvider(GoogleDriveService)
            .useValue(mockGoogleDriveService)
            .compile();

        app = moduleFixture.createNestApplication<NestFastifyApplication>(
            new FastifyAdapter(),
        );

        const fastifyInstance = app.getHttpAdapter().getInstance();
        fastifyInstance.addContentTypeParser('application/octet-stream', (_req, _payload, done) => {
            done(null);
        });

        await app.register(fastifyCookie, {
            secret: 'test-api-secret-2024-secure-and-long',
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
        if (userRepository) {
            await userRepository.deleteMany({ email: testUser.email });
        }
        if (vaultRepository && testUserId) {
            await vaultRepository.deleteMany({ ownerId: testUserId as any });
        }
        if (app) {
            await app.close();
        }
    });

    beforeEach(async () => {
        jest.clearAllMocks();
        await userRepository.deleteMany({ email: testUser.email });

        // Create test user
        const passwordHash = await argon2.hash(testUser.password);
        const user = await userRepository.create({
            username: testUser.username,
            email: testUser.email,
            passwordHash,
            pqcPublicKey: 'mock_pqc_key',
            passwordHashVersion: 2
        });
        testUserId = user._id.toString();

        // Login to get token
        const loginResponse = await app.inject({
            method: 'POST',
            url: '/api/auth/login',
            payload: {
                email: testUser.email,
                argon2Hash: testUser.password,
            },
        });

        const cookies: string[] = [].concat(loginResponse.headers['set-cookie'] as any);
        tokenCookie = cookies.find(c => c.startsWith('token=')) || '';

        // Create a pending file record
        const fileRecord = await vaultRepository.create({
            ownerId: testUserId as any,
            fileName: 'test.dat',
            originalFileName: 'test.png',
            fileSize: 1024,
            mimeType: 'image/png',
            encryptedSymmetricKey: 'mock-key',
            encapsulatedKey: 'mock-encapsulated-key',
            uploadSessionUrl: 'https://mock-session.com',
            status: 'pending',
            uploadOffset: 0,
        } as any);
        testFileId = fileRecord._id.toString();
    });

    it('should successfully upload a completed chunk', async () => {
        mockGoogleDriveService.appendChunk.mockResolvedValue({
            complete: true,
            receivedSize: 1024,
        });
        mockGoogleDriveService.finalizeUpload.mockResolvedValue('google-file-id');

        const response = await app.inject({
            method: 'PUT',
            url: `/api/vault/upload-chunk?fileId=${testFileId}`,
            headers: {
                cookie: tokenCookie,
                'content-range': 'bytes 0-1023/1024',
                'content-length': '1024',
                'content-type': 'application/octet-stream',
            },
            payload: Buffer.alloc(1024),
        });

        expect(response.statusCode).toBe(200);
        const body = JSON.parse(response.body);
        expect(body.message).toBe('Upload successful');
        expect(body.googleDriveFileId).toBe('google-file-id');

        // Verify DB update
        const updatedFile = await vaultRepository.findById(testFileId);
        expect(updatedFile!.status).toBe('completed');
        expect(updatedFile!.googleDriveFileId).toBe('google-file-id');
    });

    it('should return 308 for partial chunk upload', async () => {
        mockGoogleDriveService.appendChunk.mockResolvedValue({
            complete: false,
            receivedSize: 512,
        });

        const response = await app.inject({
            method: 'PUT',
            url: `/api/vault/upload-chunk?fileId=${testFileId}`,
            headers: {
                cookie: tokenCookie,
                'content-range': 'bytes 0-511/1024',
                'content-length': '512',
                'content-type': 'application/octet-stream',
            },
            payload: Buffer.alloc(512),
        });

        expect(response.statusCode).toBe(308);
        expect(response.headers['range']).toBe('bytes=0-511');

        // Verify DB update
        const updatedFile = await vaultRepository.findById(testFileId);
        expect(updatedFile!.status).toBe('uploading');
        expect(updatedFile!.uploadOffset).toBe(512);
    });

    it('should fail if unauthorized', async () => {
        const response = await app.inject({
            method: 'PUT',
            url: `/api/vault/upload-chunk?fileId=${testFileId}`,
            headers: {
                'content-range': 'bytes 0-1023/1024',
                'content-length': '1024',
                'content-type': 'application/octet-stream',
            },
            payload: Buffer.alloc(1024),
        });

        expect(response.statusCode).toBe(401);
    });

    it('should fail if file not found', async () => {
        const fakeFileId = '65c2a1a1a1a1a1a1a1a1a1a1';
        const response = await app.inject({
            method: 'PUT',
            url: `/api/vault/upload-chunk?fileId=${fakeFileId}`,
            headers: {
                cookie: tokenCookie,
                'content-range': 'bytes 0-1023/1024',
                'content-length': '1024',
                'content-type': 'application/octet-stream',
            },
            payload: Buffer.alloc(1024),
        });

        expect(response.statusCode).toBe(404);
    });

    it('should fail if Content-Range is missing', async () => {
        const response = await app.inject({
            method: 'PUT',
            url: `/api/vault/upload-chunk?fileId=${testFileId}`,
            headers: {
                cookie: tokenCookie,
                'content-length': '1024',
                'content-type': 'application/octet-stream',
            },
            payload: Buffer.alloc(1024),
        });

        expect(response.statusCode).toBe(400);
    });
});
