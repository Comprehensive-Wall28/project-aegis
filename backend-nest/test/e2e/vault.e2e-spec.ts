import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ExecutionContext } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { getModelToken } from '@nestjs/mongoose';
import { VaultFile } from '../../src/modules/vault/schemas/vault-file.schema';
import { Types } from 'mongoose';
import { GridFsService } from '../../src/modules/vault/gridfs.service'; // Adjust path
import { VaultService } from '../../src/modules/vault/vault.service'; // Adjust path
import { JwtService } from '@nestjs/jwt';
import { JwtAuthGuard } from '../../src/modules/auth/guards/jwt-auth.guard';

describe('VaultController (E2E)', () => {
    let app: NestFastifyApplication;
    let jwtToken: string;
    let mockGridFsService = {
        uploadStream: jest.fn().mockImplementation((stream, filename) => {
            // Consumer the stream to simulate upload
            stream.resume();
            return Promise.resolve(new Types.ObjectId());
        }),
        uploadBuffer: jest.fn().mockResolvedValue(new Types.ObjectId()),
        getFileStream: jest.fn(),
    };

    const mockVaultFileModel = {
        create: jest.fn().mockImplementation((dto) => ({
            ...dto,
            _id: new Types.ObjectId(),
            save: jest.fn().mockResolvedValue(true),
        })),
        save: jest.fn(),
        findOne: jest.fn().mockImplementation((...args) => {
            return Promise.resolve({
                _id: new Types.ObjectId(),
                save: jest.fn().mockResolvedValue(true),
                status: 'pending',
                fileSize: 1000
            });
        }),
        findById: jest.fn(),
    };

    const mockVaultService = {
        initiateUpload: jest.fn().mockResolvedValue({ fileId: new Types.ObjectId().toString() }),
        completeGridFsUpload: jest.fn().mockResolvedValue(true),
        listFiles: jest.fn().mockResolvedValue([]),
        deleteFile: jest.fn().mockResolvedValue(true),
    };

    beforeAll(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [AppModule],
        })
            .overrideProvider(GridFsService)
            .useValue(mockGridFsService)
            // We can also override VaultService if we want to isolate Controller logic entirely
            // But testing integration with Service is better usually.
            // However, for E2E speed and isolation, mocking external dependencies (GridFS/DB) is key.
            .overrideProvider(getModelToken(VaultFile.name))
            .useValue(mockVaultFileModel)
            .overrideGuard(JwtAuthGuard)
            .useValue({
                canActivate: (context: ExecutionContext) => {
                    const req = context.switchToHttp().getRequest();
                    req.user = { userId: new Types.ObjectId().toString(), email: 'test@example.com' };
                    return true;
                }
            })
            .compile();

        app = moduleFixture.createNestApplication<NestFastifyApplication>(
            new FastifyAdapter(),
        );

        // Register multipart
        await app.register(require('@fastify/multipart'));

        await app.init();
        await app.getHttpAdapter().getInstance().ready();

        // Generate JWT
        const jwtService = moduleFixture.get<JwtService>(JwtService);
        const userId = new Types.ObjectId().toString();
        // JwtStrategy uses payload.id
        jwtToken = jwtService.sign({ sub: userId, id: userId, email: 'test@example.com' });
    });

    afterAll(async () => {
        await app.close();
    });

    it('/vault/upload/gridfs (POST) - should stream upload', async () => {
        const fileId = new Types.ObjectId().toString();
        const filePath = __filename; // Upload this test file itself

        // We need to construct the multipart request manually?
        // Supertest works with Fastify adapter.

        await request(app.getHttpServer())
            .post('/vault/upload/gridfs')
            .set('Authorization', `Bearer ${jwtToken}`)
            .field('fileId', fileId) // field MUST be before file
            .attach('file', Buffer.from('test content'), 'test.txt')
            .expect(201)
            .catch((err) => {
                if (err.response) {
                    console.log('Error Response:', JSON.stringify(err.response.body, null, 2));
                }
                throw err;
            })
            .then((res: any) => {
                expect(mockGridFsService.uploadStream).toHaveBeenCalled();
                expect(mockVaultFileModel.findOne).toHaveBeenCalled(); // via completeGridFsUpload?
                // Actually we mocked VaultService logic inside VaultController? No, we didn't mock VaultService, valid decision.
                // But completeGridFsUpload calls findOne.
            });
    });
});
