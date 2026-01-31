import { Test, TestingModule } from '@nestjs/testing';
import { VaultService } from './vault.service';
import { VaultRepository } from './vault.repository';
import { StorageProvider, FileStatus } from './schemas/vault-file.schema';
import { GridFsService } from './gridfs.service';
import { GoogleDriveService } from './google-drive.service';
import { UsersService } from '../users/users.service';
import { FoldersService } from '../folders/folders.service';
import { NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { Types } from 'mongoose';
import { Readable } from 'stream';

describe('VaultService', () => {
    let service: VaultService;
    let usersService: UsersService;
    let foldersService: FoldersService;
    let googleDriveService: GoogleDriveService;
    let gridFsService: GridFsService;
    let vaultRepository: VaultRepository;

    const mockVaultRepository = {
        create: jest.fn(),
        findOne: jest.fn(),
        findById: jest.fn(),
        findByIdAndOwner: jest.fn(),
        findByIdAndStream: jest.fn(),
        findByOwnerAndFolderPaginated: jest.fn(),
        updateUploadStatus: jest.fn(),
        completeUpload: jest.fn(),
        deleteByIdAndOwner: jest.fn(),
        count: jest.fn(),
        bulkMoveFiles: jest.fn(),
    };

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
                { provide: VaultRepository, useValue: mockVaultRepository },
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
        gridFsService = module.get<GridFsService>(GridFsService);
        vaultRepository = module.get<VaultRepository>(VaultRepository);
        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('initiateUpload', () => {
        const userId = new Types.ObjectId().toString();
        const uploadDto = {
            fileName: 'test.txt',
            originalFileName: 'test.txt',
            fileSize: 1024,
            mimeType: 'text/plain',
            encryptedSymmetricKey: 'key',
            encapsulatedKey: 'enc',
        };
        const mockReq = {} as any;

        it('should initiate upload for GridFS', async () => {
            mockUsersService.findById.mockResolvedValue({ totalStorageUsed: 0 });
            mockVaultRepository.create.mockResolvedValue({ _id: new Types.ObjectId() });

            const result = await service.initiateUpload(userId, uploadDto, mockReq);

            expect(result).toHaveProperty('fileId');
            expect(mockVaultRepository.create).toHaveBeenCalled();
        });

        it('should initiate upload for Google Drive if size > 50MB', async () => {
            const largeFileDto = { ...uploadDto, fileSize: 60 * 1024 * 1024 };
            mockUsersService.findById.mockResolvedValue({ totalStorageUsed: 0 });
            mockGoogleDriveService.initiateUpload.mockResolvedValue('stream_id');
            mockVaultRepository.create.mockResolvedValue({ _id: new Types.ObjectId() });

            const result = await service.initiateUpload(userId, largeFileDto, mockReq);

            expect(mockGoogleDriveService.initiateUpload).toHaveBeenCalled();
            expect(result).toHaveProperty('fileId');
        });

        it('should throw NotFoundException if user not found', async () => {
            mockUsersService.findById.mockResolvedValue(null);
            await expect(service.initiateUpload(userId, uploadDto, mockReq)).rejects.toThrow(NotFoundException);
        });

        it('should throw ForbiddenException if storage limit exceeded', async () => {
            mockUsersService.findById.mockResolvedValue({ totalStorageUsed: 5 * 1024 * 1024 * 1024 });
            await expect(service.initiateUpload(userId, uploadDto, mockReq)).rejects.toThrow(ForbiddenException);
        });
    });

    describe('uploadChunk', () => {
        const userId = 'user_id';
        const fileId = 'file_id';

        it('should throw NotFoundException if file session not found', async () => {
            mockVaultRepository.findByIdAndStream.mockResolvedValue(null);
            await expect(service.uploadChunk(userId, fileId, Buffer.from(''), 0, 0, 0, 0)).rejects.toThrow(NotFoundException);
        });

        it('should handle Google Drive chunk upload', async () => {
            const mockFile = {
                uploadStreamId: 'stream_id',
                storageProvider: StorageProvider.GOOGLE_DRIVE,
                status: FileStatus.PENDING,
                fileSize: 100,
                originalFileName: 'test.txt'
            };
            mockVaultRepository.findByIdAndStream.mockResolvedValue(mockFile);
            mockGoogleDriveService.appendChunk.mockResolvedValue({ complete: true });
            mockGoogleDriveService.finalizeUpload.mockResolvedValue('drive_id');

            const result = await service.uploadChunk(userId, fileId, Buffer.from('test'), 4, 0, 3, 100);

            expect(result.complete).toBe(true);
            expect(mockVaultRepository.completeUpload).toHaveBeenCalledWith(fileId, 'drive_id');
            expect(usersService.updateStorageUsage).toHaveBeenCalledWith(userId, 100);
        });
    });

    describe('getDownloadStream', () => {
        const userId = '507f1f77bcf86cd799439011';
        const fileId = '507f1f77bcf86cd799439012';

        it('should return GridFS stream for owner', async () => {
            const mockFile = {
                ownerId: new Types.ObjectId(userId),
                storageProvider: StorageProvider.GRIDFS,
                gridFsId: new Types.ObjectId(),
                mimeType: 'text/plain',
                originalFileName: 'test.txt',
            };
            mockVaultRepository.findByIdAndOwner.mockResolvedValue(mockFile);
            const mockStream = new Readable();
            mockGridFsService.getFileStream.mockReturnValue(mockStream);

            const result = await service.getDownloadStream(userId, fileId);
            expect(result.stream).toBe(mockStream);
        });

        it('should check shared access if not owner', async () => {
            const mockFile = {
                ownerId: new Types.ObjectId(),
                folderId: new Types.ObjectId(),
                storageProvider: StorageProvider.GRIDFS,
                gridFsId: new Types.ObjectId(),
                mimeType: 'text/plain',
                originalFileName: 'test.txt',
            };
            mockVaultRepository.findByIdAndOwner.mockResolvedValue(null);
            mockVaultRepository.findById.mockResolvedValue(mockFile);
            mockFoldersService.checkAccess.mockResolvedValue(true);
            const mockStream = new Readable();
            mockGridFsService.getFileStream.mockReturnValue(mockStream);

            const result = await service.getDownloadStream(userId, fileId);
            expect(result.stream).toBe(mockStream);
            expect(mockFoldersService.checkAccess).toHaveBeenCalled();
        });
    });

    describe('deleteFile', () => {
        const userId = 'user_id';
        const fileId = 'file_id';

        it('should delete file and log action', async () => {
            const mockFile = {
                _id: fileId,
                ownerId: userId,
                storageProvider: StorageProvider.GRIDFS,
                gridFsId: 'gridfs_id',
                fileSize: 100,
                originalFileName: 'test.txt',
                status: FileStatus.COMPLETED
            };
            mockVaultRepository.findByIdAndOwner.mockResolvedValue(mockFile);
            const mockReq = {} as any;

            await service.deleteFile(userId, fileId, mockReq);

            expect(gridFsService.deleteFile).toHaveBeenCalled();
            expect(mockVaultRepository.deleteByIdAndOwner).toHaveBeenCalledWith(fileId, userId);
            expect(usersService.updateStorageUsage).toHaveBeenCalledWith(userId, -100);
        });
    });

    describe('getStorageStats', () => {
        it('should return legacy format', async () => {
            mockUsersService.findById.mockResolvedValue({ totalStorageUsed: 500 });
            const result = await service.getStorageStats('user_id');
            expect(result).toEqual({
                totalStorageUsed: 500,
                maxStorage: 5 * 1024 * 1024 * 1024
            });
        });
    });
});
