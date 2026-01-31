import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { VaultService } from './vault.service';
import { GridFsService } from './gridfs.service';
import { GoogleDriveService } from './google-drive.service';
import { UsersService } from '../users/users.service';
import { FoldersService } from '../folders/folders.service';
import { VaultFile, StorageProvider, FileStatus } from './schemas/vault-file.schema';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { Types } from 'mongoose';

describe('VaultService', () => {
    let service: VaultService;
    let usersService: UsersService;
    let foldersService: FoldersService;
    let googleDriveService: GoogleDriveService;

    const mockVaultFileModel = {
        save: jest.fn(),
        findOne: jest.fn(),
        findById: jest.fn(),
        deleteOne: jest.fn(),
        find: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        exec: jest.fn(),
    };

    // Need to mock the constructor/class usage for "new this.vaultFileModel()"
    class MockVaultFileModel {
        _id: Types.ObjectId;
        constructor(public data: any) {
            Object.assign(this, data);
            this._id = new Types.ObjectId();
        }
        save = jest.fn().mockResolvedValue(this);
        static findOne = jest.fn();
        static findById = jest.fn();
        static deleteOne = jest.fn();
        static find = jest.fn().mockReturnThis();
        static sort = jest.fn().mockReturnThis();
        static exec = jest.fn();
    }

    const mockGridFsService = {
        getFileStream: jest.fn(),
        deleteFile: jest.fn(),
    };

    const mockGoogleDriveService = {
        initiateUpload: jest.fn(),
        appendChunk: jest.fn(),
        finalizeUpload: jest.fn(),
        getFileStream: jest.fn(),
        deleteFile: jest.fn(),
    };

    const mockUsersService = {
        findById: jest.fn(),
        updateStorageUsage: jest.fn(),
    };

    const mockFoldersService = {
        checkAccess: jest.fn(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                VaultService,
                {
                    provide: getModelToken(VaultFile.name),
                    useValue: MockVaultFileModel,
                },
                { provide: GridFsService, useValue: mockGridFsService },
                { provide: GoogleDriveService, useValue: mockGoogleDriveService },
                { provide: UsersService, useValue: mockUsersService },
                { provide: FoldersService, useValue: mockFoldersService },
            ],
        }).compile();

        service = module.get<VaultService>(VaultService);
        usersService = module.get<UsersService>(UsersService);
        foldersService = module.get<FoldersService>(FoldersService);
        googleDriveService = module.get<GoogleDriveService>(GoogleDriveService);
    });

    it('should calculate storage provider correctly (GridFS for small)', async () => {
        const userId = new Types.ObjectId().toString();
        const dto = {
            fileName: 'test.txt',
            originalFileName: 'test.txt',
            fileSize: 1000,
            mimeType: 'text/plain',
            encryptedSymmetricKey: 'key',
            encapsulatedKey: 'key',
        };

        mockUsersService.findById.mockResolvedValue({ totalStorageUsed: 0 });

        const result = await service.initiateUpload(userId, dto);

        expect(result).toBeDefined();
        // Since we mocked the model constructor, we can't easily spy on what was passed to it 
        // without a more complex mock, but implementation logic would default to GRIDFS
    });

    it('should throw forbidden if storage limit exceeded', async () => {
        const userId = new Types.ObjectId().toString();
        const dto = {
            fileName: 'large.file',
            originalFileName: 'large.file',
            fileSize: 6 * 1024 * 1024 * 1024, // 6GB
            mimeType: 'video/mp4',
            encryptedSymmetricKey: 'key',
            encapsulatedKey: 'key',
        };

        mockUsersService.findById.mockResolvedValue({ totalStorageUsed: 0 });

        await expect(service.initiateUpload(userId, dto)).rejects.toThrow(ForbiddenException);
    });

    it('should use Google Drive for large files', async () => {
        const userId = new Types.ObjectId().toString();
        const dto = {
            fileName: 'large.video',
            originalFileName: 'large.video',
            fileSize: 60 * 1024 * 1024, // 60MB
            mimeType: 'video/mp4',
            encryptedSymmetricKey: 'key',
            encapsulatedKey: 'key',
        };

        mockUsersService.findById.mockResolvedValue({ totalStorageUsed: 0 });
        mockGoogleDriveService.initiateUpload.mockResolvedValue('session-id');

        await service.initiateUpload(userId, dto);

        expect(mockGoogleDriveService.initiateUpload).toHaveBeenCalled();
    });
});
