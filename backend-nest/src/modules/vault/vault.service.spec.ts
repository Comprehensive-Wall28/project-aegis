import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { VaultService } from './vault.service';
import { VaultFile, StorageProvider, FileStatus } from './schemas/vault-file.schema';
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

    // We need a way to mock "new this.vaultFileModel(data)"
    // and also the static methods like findOne, findById, etc.
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
        static countDocuments = jest.fn().mockReturnThis();
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
        gridFsService = module.get<GridFsService>(GridFsService);
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

        it('should initiate upload for GridFS', async () => {
            mockUsersService.findById.mockResolvedValue({ totalStorageUsed: 0 });

            const result = await service.initiateUpload(userId, uploadDto);

            expect(result).toHaveProperty('fileId');
        });

        it('should initiate upload for Google Drive if size > 50MB', async () => {
            const largeFileDto = { ...uploadDto, fileSize: 60 * 1024 * 1024 };
            mockUsersService.findById.mockResolvedValue({ totalStorageUsed: 0 });
            mockGoogleDriveService.initiateUpload.mockResolvedValue('stream_id');

            const result = await service.initiateUpload(userId, largeFileDto);

            expect(mockGoogleDriveService.initiateUpload).toHaveBeenCalled();
            expect(result).toHaveProperty('fileId');
        });

        it('should throw NotFoundException if user not found', async () => {
            mockUsersService.findById.mockResolvedValue(null);
            await expect(service.initiateUpload(userId, uploadDto)).rejects.toThrow(NotFoundException);
        });

        it('should throw ForbiddenException if storage limit exceeded', async () => {
            mockUsersService.findById.mockResolvedValue({ totalStorageUsed: 5 * 1024 * 1024 * 1024 });
            await expect(service.initiateUpload(userId, uploadDto)).rejects.toThrow(ForbiddenException);
        });

        it('should throw ForbiddenException if folder access denied', async () => {
            mockUsersService.findById.mockResolvedValue({ totalStorageUsed: 0 });
            mockFoldersService.checkAccess.mockResolvedValue(false);
            const dtoWithFolder = { ...uploadDto, folderId: 'folder_id' };

            await expect(service.initiateUpload(userId, dtoWithFolder)).rejects.toThrow(ForbiddenException);
        });
    });

    describe('uploadChunk', () => {
        const userId = 'user_id';
        const fileId = 'file_id';

        it('should throw NotFoundException if file session not found', async () => {
            MockVaultFileModel.findOne.mockResolvedValue(null);
            await expect(service.uploadChunk(userId, fileId, Buffer.from(''), 0, 0, 0, 0)).rejects.toThrow(NotFoundException);
        });

        it('should handle Google Drive chunk upload', async () => {
            const mockFile = {
                uploadStreamId: 'stream_id',
                storageProvider: StorageProvider.GOOGLE_DRIVE,
                status: FileStatus.PENDING,
                save: jest.fn().mockResolvedValue(true),
                fileSize: 100,
            };
            MockVaultFileModel.findOne.mockResolvedValue(mockFile);
            mockGoogleDriveService.appendChunk.mockResolvedValue({ complete: true });
            mockGoogleDriveService.finalizeUpload.mockResolvedValue('drive_id');

            const result = await service.uploadChunk(userId, fileId, Buffer.from('test'), 4, 0, 3, 100);

            expect(result.complete).toBe(true);
            expect(mockFile.status).toBe(FileStatus.COMPLETED);
            expect(usersService.updateStorageUsage).toHaveBeenCalledWith(userId, 100);
        });

        it('should throw BadRequestException for GridFS chunk upload', async () => {
            const mockFile = {
                uploadStreamId: 'stream_id',
                storageProvider: StorageProvider.GRIDFS,
                status: FileStatus.PENDING,
                save: jest.fn().mockResolvedValue(true),
            };
            MockVaultFileModel.findOne.mockResolvedValue(mockFile);

            await expect(service.uploadChunk(userId, fileId, Buffer.from('test'), 4, 0, 3, 100)).rejects.toThrow(BadRequestException);
        });
    });

    describe('completeGridFsUpload', () => {
        it('should complete GridFS upload', async () => {
            const mockFile = {
                save: jest.fn().mockResolvedValue(true),
                fileSize: 1000,
            };
            MockVaultFileModel.findOne.mockResolvedValue(mockFile);
            const gridFsId = new Types.ObjectId();

            await service.completeGridFsUpload('user_id', 'file_id', gridFsId);

            expect(mockFile.save).toHaveBeenCalled();
            expect(usersService.updateStorageUsage).toHaveBeenCalledWith('user_id', 1000);
        });

        it('should throw NotFoundException if file not found', async () => {
            MockVaultFileModel.findOne.mockResolvedValue(null);
            await expect(service.completeGridFsUpload('u', 'f', new Types.ObjectId())).rejects.toThrow(NotFoundException);
        });
    });

    describe('getDownloadStream', () => {
        const userId = '507f1f77bcf86cd799439011';
        const fileId = '507f1f77bcf86cd799439012';

        it('should throw NotFoundException if file not found', async () => {
            MockVaultFileModel.findById.mockResolvedValue(null);
            await expect(service.getDownloadStream(userId, fileId)).rejects.toThrow(NotFoundException);
        });

        it('should return GridFS stream', async () => {
            const mockFile = {
                ownerId: new Types.ObjectId(userId),
                storageProvider: StorageProvider.GRIDFS,
                gridFsId: new Types.ObjectId().toString(),
                mimeType: 'text/plain',
                originalFileName: 'test.txt',
            };
            MockVaultFileModel.findById.mockResolvedValue(mockFile);
            const mockStream = new Readable();
            mockGridFsService.getFileStream.mockReturnValue(mockStream);

            const result = await service.getDownloadStream(userId, fileId);
            expect(result.stream).toBe(mockStream);
        });

        it('should return Google Drive stream', async () => {
            const mockFile = {
                ownerId: new Types.ObjectId(userId),
                storageProvider: StorageProvider.GOOGLE_DRIVE,
                googleDriveFileId: 'drive_id',
                mimeType: 'text/plain',
                originalFileName: 'test.txt',
            };
            MockVaultFileModel.findById.mockResolvedValue(mockFile);
            const mockStream = new Readable();
            mockGoogleDriveService.getFileStream.mockResolvedValue(mockStream);

            const result = await service.getDownloadStream(userId, fileId);
            expect(result.stream).toBe(mockStream);
        });

        it('should throw ForbiddenException if access denied', async () => {
            const mockFile = {
                ownerId: new Types.ObjectId(),
                folderId: null,
            };
            MockVaultFileModel.findById.mockResolvedValue(mockFile);

            await expect(service.getDownloadStream(userId, fileId)).rejects.toThrow(ForbiddenException);
        });
    });

    describe('deleteFile', () => {
        const userId = 'user_id';
        const fileId = 'file_id';

        it('should delete GridFS file', async () => {
            const mockFile = {
                _id: fileId,
                ownerId: userId,
                storageProvider: StorageProvider.GRIDFS,
                gridFsId: 'gridfs_id',
                fileSize: 100,
            };
            MockVaultFileModel.findOne.mockResolvedValue(mockFile);

            await service.deleteFile(userId, fileId);

            expect(gridFsService.deleteFile).toHaveBeenCalled();
            expect(MockVaultFileModel.deleteOne).toHaveBeenCalled();
            expect(usersService.updateStorageUsage).toHaveBeenCalledWith(userId, -100);
        });

        it('should delete Google Drive file', async () => {
            const mockFile = {
                _id: fileId,
                ownerId: userId,
                storageProvider: StorageProvider.GOOGLE_DRIVE,
                googleDriveFileId: 'drive_id',
                fileSize: 100,
            };
            MockVaultFileModel.findOne.mockResolvedValue(mockFile);

            await service.deleteFile(userId, fileId);

            expect(googleDriveService.deleteFile).toHaveBeenCalled();
            expect(MockVaultFileModel.deleteOne).toHaveBeenCalled();
        });

        it('should throw NotFoundException if file not found', async () => {
            MockVaultFileModel.findOne.mockResolvedValue(null);
            await expect(service.deleteFile(userId, fileId)).rejects.toThrow(NotFoundException);
        });
    });

    describe('listFiles', () => {
        it('should list files for root', async () => {
            MockVaultFileModel.exec.mockResolvedValue([]);
            await service.listFiles('user_id');
            expect(MockVaultFileModel.find).toHaveBeenCalledWith(expect.objectContaining({ folderId: null }));
        });

        it('should list files for specific folder', async () => {
            const folderId = new Types.ObjectId();
            MockVaultFileModel.exec.mockResolvedValue([]);
            await service.listFiles('user_id', folderId.toString());
            expect(MockVaultFileModel.find).toHaveBeenCalledWith(expect.objectContaining({ folderId }));
        });
    });

    describe('countFiles', () => {
        it('should count files', async () => {
            MockVaultFileModel.exec.mockResolvedValue(5);
            const result = await service.countFiles('u', 'f');
            expect(result).toBe(5);
        });
    });
});
