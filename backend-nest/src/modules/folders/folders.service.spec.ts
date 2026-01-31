import { Test, TestingModule } from '@nestjs/testing';
import { FoldersService } from './folders.service';
import { FolderRepository } from './folders.repository';
import { VaultService } from '../vault/vault.service';
import { NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { Types } from 'mongoose';
import { getModelToken } from '@nestjs/mongoose';
import { SharedFolder } from './schemas/shared-folder.schema';

describe('FoldersService', () => {
    let service: FoldersService;
    let folderRepository: FolderRepository;
    let vaultService: VaultService;

    const mockFolderRepository = {
        findMany: jest.fn(),
        findById: jest.fn(),
        findOne: jest.fn(),
        create: jest.fn(),
        updateById: jest.fn(),
        count: jest.fn(),
        deleteById: jest.fn(),
    };

    const mockSharedFolderModel = {
        find: jest.fn().mockReturnThis(),
        findOne: jest.fn().mockReturnThis(),
        populate: jest.fn().mockReturnThis(),
        exec: jest.fn(),
    };

    const mockVaultService = {
        countFiles: jest.fn(),
        bulkMoveFiles: jest.fn(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                FoldersService,
                { provide: FolderRepository, useValue: mockFolderRepository },
                { provide: getModelToken(SharedFolder.name), useValue: mockSharedFolderModel },
                { provide: VaultService, useValue: mockVaultService },
            ],
        }).compile();

        service = module.get<FoldersService>(FoldersService);
        folderRepository = module.get<FolderRepository>(FolderRepository);
        vaultService = module.get<VaultService>(VaultService);
        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('getFolders', () => {
        const userId = new Types.ObjectId().toString();

        it('should return root folders including shared ones', async () => {
            mockFolderRepository.findMany.mockResolvedValue([]);
            (mockSharedFolderModel.find as jest.Mock).mockReturnValue({
                populate: jest.fn().mockResolvedValue([]),
            });

            const result = await service.getFolders(userId);
            expect(result).toEqual([]);
            expect(mockFolderRepository.findMany).toHaveBeenCalledWith(expect.objectContaining({ parentId: null }));
        });

        it('should throw BadRequest if parentId is invalid', async () => {
            await expect(service.getFolders(userId, 'invalid')).rejects.toThrow(BadRequestException);
        });

        it('should throw NotFound if parent folder not found', async () => {
            mockFolderRepository.findById.mockResolvedValue(null);
            await expect(service.getFolders(userId, new Types.ObjectId().toString())).rejects.toThrow(NotFoundException);
        });

        it('should return subfolders if user is owner', async () => {
            const parentId = new Types.ObjectId().toString();
            mockFolderRepository.findById.mockResolvedValue({
                ownerId: new Types.ObjectId(userId),
                _id: parentId
            });
            mockFolderRepository.findMany.mockResolvedValue([]);

            const result = await service.getFolders(userId, parentId);
            expect(result).toEqual([]);
        });
    });

    describe('deleteFolder', () => {
        const userId = new Types.ObjectId().toString();
        const folderId = new Types.ObjectId().toString();

        it('should delete folder if empty', async () => {
            mockFolderRepository.findOne.mockResolvedValue({ _id: folderId, ownerId: userId });
            mockFolderRepository.count.mockResolvedValue(0); // no subfolders
            mockVaultService.countFiles.mockResolvedValue(0); // no files

            await service.deleteFolder(userId, folderId);

            expect(mockFolderRepository.deleteById).toHaveBeenCalledWith(folderId);
        });

        it('should throw BadRequest if it has subfolders', async () => {
            mockFolderRepository.findOne.mockResolvedValue({ _id: folderId, ownerId: userId });
            mockFolderRepository.count.mockResolvedValue(1);
            await expect(service.deleteFolder(userId, folderId)).rejects.toThrow('Cannot delete folder with subfolders. Delete subfolders first.');
        });

        it('should throw BadRequest if it has files', async () => {
            mockFolderRepository.findOne.mockResolvedValue({ _id: folderId, ownerId: userId });
            mockFolderRepository.count.mockResolvedValue(0);
            mockVaultService.countFiles.mockResolvedValue(1);
            await expect(service.deleteFolder(userId, folderId)).rejects.toThrow('Cannot delete folder with files. Move or delete files first.');
        });
    });

    describe('getFolder', () => {
        it('should build path correctly', async () => {
            const userId = new Types.ObjectId().toString();
            const rootId = new Types.ObjectId();
            const childId = new Types.ObjectId();

            const rootFolder = { _id: rootId, name: 'Root', parentId: null, toObject: () => ({ _id: rootId, name: 'Root' }) };
            const childFolder = { _id: childId, name: 'Child', parentId: rootId, toObject: () => ({ _id: childId, name: 'Child', parentId: rootId }) };

            mockFolderRepository.findOne.mockResolvedValue(childFolder);
            mockFolderRepository.findById.mockResolvedValueOnce(rootFolder);

            const result = await service.getFolder(userId, childId.toString());

            expect(result.path).toHaveLength(1);
            expect(result.path[0].name).toBe('Root');
        });
    });

    describe('moveFiles', () => {
        it('should call VaultService.bulkMoveFiles', async () => {
            const userId = new Types.ObjectId().toString();
            const folderId = new Types.ObjectId().toString();
            const updates = [{ fileId: new Types.ObjectId().toString(), encryptedKey: 'k', encapsulatedKey: 'e' }];

            mockFolderRepository.findById.mockResolvedValue({ ownerId: new Types.ObjectId(userId) });
            mockVaultService.bulkMoveFiles.mockResolvedValue(1);

            const result = await service.moveFiles(userId, { updates, folderId });

            expect(result).toBe(1);
            expect(mockVaultService.bulkMoveFiles).toHaveBeenCalledWith(userId, updates, folderId);
        });
    });
});
