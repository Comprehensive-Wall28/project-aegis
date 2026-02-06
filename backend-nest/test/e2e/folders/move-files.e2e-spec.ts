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
import { VaultRepository } from '../../../src/modules/vault/repositories/vault.repository';
import { Folder, FolderDocument } from '../../../src/modules/folders/schemas/folder.schema';
import { FileMetadata, FileMetadataDocument } from '../../../src/modules/vault/schemas/file-metadata.schema';

describe('Folders (e2e) - PUT /api/folders/move-files', () => {
    let app: NestFastifyApplication;
    let userRepository: UserRepository;
    let folderRepository: FolderRepository;
    let vaultRepository: VaultRepository;
    let folderModel: Model<FolderDocument>;
    let fileMetadataModel: Model<FileMetadataDocument>;

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
        vaultRepository = moduleFixture.get<VaultRepository>(VaultRepository);
        folderModel = moduleFixture.get<Model<FolderDocument>>(getModelToken(Folder.name, 'primary'));
        fileMetadataModel = moduleFixture.get<Model<FileMetadataDocument>>(getModelToken(FileMetadata.name, 'primary'));
    });

    afterAll(async () => {
        // Cleanup all test users and their data
        const testEmails = [testUser.email, 'other_user@example.com', 'other_user_2@example.com'];
        const users = await userRepository.findMany({ email: { $in: testEmails } });

        for (const user of users) {
            await folderModel.deleteMany({ ownerId: user._id });
            await fileMetadataModel.deleteMany({ ownerId: user._id });
        }

        await userRepository.deleteMany({ email: { $in: testEmails } });
        await app.close();
    });

    const testPasswordRaw = 'password123';
    const testUser = {
        username: 'move_files_test',
        email: 'move_files_test@example.com',
    };
    let userId: string;
    let tokenCookie: string | undefined;

    beforeAll(async () => {
        // Cleanup users from previous test runs
        await userRepository.deleteMany({
            email: {
                $in: [testUser.email, 'other_user@example.com', 'other_user_2@example.com']
            }
        });

        // Cleanup any leftover files/folders from these users
        const usersToCleanup = await userRepository.findMany({
            email: { $in: ['other_user@example.com', 'other_user_2@example.com'] }
        });
        for (const user of usersToCleanup) {
            await folderModel.deleteMany({ ownerId: user._id });
            await fileMetadataModel.deleteMany({ ownerId: user._id });
        }

        // Create test user
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
        // Cleanup folders and files
        await folderModel.deleteMany({ ownerId: new Types.ObjectId(userId) });
        await fileMetadataModel.deleteMany({ ownerId: new Types.ObjectId(userId) });
    });

    it('should move files to a folder', async () => {
        // Create target folder
        const targetFolder = await folderModel.create({
            ownerId: new Types.ObjectId(userId),
            name: 'Target Folder',
            parentId: null as any,
            encryptedSessionKey: 'mock-folder-key',
            isShared: false,
        } as any) as any;

        // Create files at root level
        const file1 = await fileMetadataModel.create({
            ownerId: new Types.ObjectId(userId),
            folderId: null,
            fileName: 'encrypted-file-1',
            originalFileName: 'file1.txt',
            fileSize: 1024,
            encapsulatedKey: 'original-enc-key-1',
            encryptedSymmetricKey: 'original-sym-key-1',
            mimeType: 'text/plain',
            status: 'completed',
        } as any) as any;

        const file2 = await fileMetadataModel.create({
            ownerId: new Types.ObjectId(userId),
            folderId: null,
            fileName: 'encrypted-file-2',
            originalFileName: 'file2.txt',
            fileSize: 2048,
            encapsulatedKey: 'original-enc-key-2',
            encryptedSymmetricKey: 'original-sym-key-2',
            mimeType: 'text/plain',
            status: 'completed',
        } as any) as any;

        const response = await app.inject({
            method: 'PUT',
            url: '/api/folders/move-files',
            headers: {
                cookie: tokenCookie,
            },
            payload: {
                folderId: targetFolder._id.toString(),
                updates: [
                    {
                        fileId: file1._id.toString(),
                        encryptedKey: 'new-sym-key-1',
                        encapsulatedKey: 'new-enc-key-1',
                    },
                    {
                        fileId: file2._id.toString(),
                        encryptedKey: 'new-sym-key-2',
                        encapsulatedKey: 'new-enc-key-2',
                    },
                ],
            },
        });

        expect(response.statusCode).toBe(200);
        const body = JSON.parse(response.payload);
        expect(body.message).toBe('Moved 2 file(s)');
        expect(body.modifiedCount).toBe(2);

        // Verify files were moved
        const updatedFile1 = await fileMetadataModel.findById(file1._id);
        const updatedFile2 = await fileMetadataModel.findById(file2._id);

        expect(updatedFile1?.folderId?.toString()).toBe(targetFolder._id.toString());
        expect(updatedFile1?.encryptedSymmetricKey).toBe('new-sym-key-1');
        expect(updatedFile1?.encapsulatedKey).toBe('new-enc-key-1');

        expect(updatedFile2?.folderId?.toString()).toBe(targetFolder._id.toString());
        expect(updatedFile2?.encryptedSymmetricKey).toBe('new-sym-key-2');
        expect(updatedFile2?.encapsulatedKey).toBe('new-enc-key-2');
    });

    it('should move files to root (null folderId)', async () => {
        // Create a folder with a file
        const sourceFolder = await folderModel.create({
            ownerId: new Types.ObjectId(userId),
            name: 'Source Folder',
            parentId: null as any,
            encryptedSessionKey: 'mock-folder-key',
            isShared: false,
        } as any) as any;

        const file = await fileMetadataModel.create({
            ownerId: new Types.ObjectId(userId),
            folderId: sourceFolder._id,
            fileName: 'encrypted-file',
            originalFileName: 'file.txt',
            fileSize: 1024,
            encapsulatedKey: 'original-enc-key',
            encryptedSymmetricKey: 'original-sym-key',
            mimeType: 'text/plain',
            status: 'completed',
        } as any) as any;

        const response = await app.inject({
            method: 'PUT',
            url: '/api/folders/move-files',
            headers: {
                cookie: tokenCookie,
            },
            payload: {
                folderId: null,
                updates: [
                    {
                        fileId: file._id.toString(),
                        encryptedKey: 'new-sym-key',
                        encapsulatedKey: 'new-enc-key',
                    },
                ],
            },
        });

        expect(response.statusCode).toBe(200);
        const body = JSON.parse(response.payload);
        expect(body.message).toBe('Moved 1 file(s)');
        expect(body.modifiedCount).toBe(1);

        // Verify file was moved to root
        const updatedFile = await fileMetadataModel.findById(file._id);
        expect(updatedFile?.folderId).toBeNull();
        expect(updatedFile?.encryptedSymmetricKey).toBe('new-sym-key');
        expect(updatedFile?.encapsulatedKey).toBe('new-enc-key');
    });

    it('should move files when folderId is not provided (defaults to root)', async () => {
        const file = await fileMetadataModel.create({
            ownerId: new Types.ObjectId(userId),
            folderId: null,
            fileName: 'encrypted-file',
            originalFileName: 'file.txt',
            fileSize: 1024,
            encapsulatedKey: 'original-enc-key',
            encryptedSymmetricKey: 'original-sym-key',
            mimeType: 'text/plain',
            status: 'completed',
        } as any) as any;

        const response = await app.inject({
            method: 'PUT',
            url: '/api/folders/move-files',
            headers: {
                cookie: tokenCookie,
            },
            payload: {
                updates: [
                    {
                        fileId: file._id.toString(),
                        encryptedKey: 'new-sym-key',
                        encapsulatedKey: 'new-enc-key',
                    },
                ],
            },
        });

        expect(response.statusCode).toBe(200);
        const body = JSON.parse(response.payload);
        expect(body.modifiedCount).toBe(1);
    });

    it('should return 404 when target folder does not exist', async () => {
        const nonExistentFolderId = new Types.ObjectId().toString();

        const response = await app.inject({
            method: 'PUT',
            url: '/api/folders/move-files',
            headers: {
                cookie: tokenCookie,
            },
            payload: {
                folderId: nonExistentFolderId,
                updates: [
                    {
                        fileId: new Types.ObjectId().toString(),
                        encryptedKey: 'new-key',
                        encapsulatedKey: 'new-enc-key',
                    },
                ],
            },
        });

        expect(response.statusCode).toBe(404);
        const body = JSON.parse(response.payload);
        expect(body.message).toBe('Target folder not found');
    });

    it('should return 404 when target folder belongs to another user', async () => {
        // Create another user
        const otherUser = await userRepository.create({
            username: 'other_user',
            email: 'other_user@example.com',
            passwordHash: await argon2.hash(testPasswordRaw),
            passwordHashVersion: 2,
            pqcPublicKey: 'test-pqc-key'
        });

        // Create folder for other user
        const otherUserFolder = await folderModel.create({
            ownerId: otherUser._id,
            name: 'Other User Folder',
            parentId: null as any,
            encryptedSessionKey: 'mock-folder-key',
            isShared: false,
        } as any) as any;

        const response = await app.inject({
            method: 'PUT',
            url: '/api/folders/move-files',
            headers: {
                cookie: tokenCookie,
            },
            payload: {
                folderId: otherUserFolder._id.toString(),
                updates: [
                    {
                        fileId: new Types.ObjectId().toString(),
                        encryptedKey: 'new-key',
                        encapsulatedKey: 'new-enc-key',
                    },
                ],
            },
        });

        expect(response.statusCode).toBe(404);
        const body = JSON.parse(response.payload);
        expect(body.message).toBe('Target folder not found');

        // Cleanup other user
        await userRepository.deleteMany({ email: 'other_user@example.com' });
        await folderModel.deleteMany({ ownerId: otherUser._id });
    });

    it('should return 400 when updates is empty', async () => {
        const response = await app.inject({
            method: 'PUT',
            url: '/api/folders/move-files',
            headers: {
                cookie: tokenCookie,
            },
            payload: {
                folderId: null,
                updates: [],
            },
        });

        expect(response.statusCode).toBe(400);
        const body = JSON.parse(response.payload);
        expect(body.message).toBe('File updates are required');
    });

    it('should return 400 when updates is missing', async () => {
        const response = await app.inject({
            method: 'PUT',
            url: '/api/folders/move-files',
            headers: {
                cookie: tokenCookie,
            },
            payload: {
                folderId: null,
            },
        });

        expect(response.statusCode).toBe(400);
    });

    it('should return 400 when file update is missing required fields', async () => {
        const response = await app.inject({
            method: 'PUT',
            url: '/api/folders/move-files',
            headers: {
                cookie: tokenCookie,
            },
            payload: {
                folderId: null,
                updates: [
                    {
                        fileId: new Types.ObjectId().toString(),
                        // missing encryptedKey and encapsulatedKey
                    },
                ],
            },
        });

        expect(response.statusCode).toBe(400);
    });

    it('should return 401 when not authenticated', async () => {
        const response = await app.inject({
            method: 'PUT',
            url: '/api/folders/move-files',
            payload: {
                folderId: null,
                updates: [
                    {
                        fileId: new Types.ObjectId().toString(),
                        encryptedKey: 'new-key',
                        encapsulatedKey: 'new-enc-key',
                    },
                ],
            },
        });

        expect(response.statusCode).toBe(401);
    });

    it('should only modify files owned by the user', async () => {
        // Create another user
        const otherUser = await userRepository.create({
            username: 'other_user_2',
            email: 'other_user_2@example.com',
            passwordHash: await argon2.hash(testPasswordRaw),
            passwordHashVersion: 2,
            pqcPublicKey: 'test-pqc-key'
        });

        // Create a file for other user
        const otherUserFile = await fileMetadataModel.create({
            ownerId: otherUser._id,
            folderId: null,
            fileName: 'encrypted-file',
            originalFileName: 'other-file.txt',
            fileSize: 1024,
            encapsulatedKey: 'original-enc-key',
            encryptedSymmetricKey: 'original-sym-key',
            mimeType: 'text/plain',
            status: 'completed',
        } as any) as any;

        // Create a file for current user
        const userFile = await fileMetadataModel.create({
            ownerId: new Types.ObjectId(userId),
            folderId: null,
            fileName: 'encrypted-file',
            originalFileName: 'user-file.txt',
            fileSize: 1024,
            encapsulatedKey: 'original-enc-key',
            encryptedSymmetricKey: 'original-sym-key',
            mimeType: 'text/plain',
            status: 'completed',
        } as any) as any;

        const response = await app.inject({
            method: 'PUT',
            url: '/api/folders/move-files',
            headers: {
                cookie: tokenCookie,
            },
            payload: {
                folderId: null,
                updates: [
                    {
                        fileId: otherUserFile._id.toString(),
                        encryptedKey: 'new-key-1',
                        encapsulatedKey: 'new-enc-key-1',
                    },
                    {
                        fileId: userFile._id.toString(),
                        encryptedKey: 'new-key-2',
                        encapsulatedKey: 'new-enc-key-2',
                    },
                ],
            },
        });

        expect(response.statusCode).toBe(200);
        const body = JSON.parse(response.payload);
        expect(body.modifiedCount).toBe(1); // Only the user's file

        // Verify other user's file was not modified
        const unchangedFile = await fileMetadataModel.findById(otherUserFile._id);
        expect(unchangedFile?.encryptedSymmetricKey).toBe('original-sym-key');

        // Verify user's file was modified
        const changedFile = await fileMetadataModel.findById(userFile._id);
        expect(changedFile?.encryptedSymmetricKey).toBe('new-key-2');

        // Cleanup other user
        await userRepository.deleteMany({ email: 'other_user_2@example.com' });
        await fileMetadataModel.deleteMany({ ownerId: otherUser._id });
    });
});
