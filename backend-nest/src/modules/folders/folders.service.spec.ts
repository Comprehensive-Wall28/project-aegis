import { Test, TestingModule } from '@nestjs/testing';
import { FoldersService } from './folders.service';
import { FolderRepository } from './folders.repository';
import { VaultService } from '../vault/vault.service';
import { NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { Types } from 'mongoose';

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

    const mockVaultService = {
        countFiles: jest.fn(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                FoldersService,
                { provide: FolderRepository, useValue: mockFolderRepository },
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

        it('should return root folders', async () => {
            mockFolderRepository.findMany.mockResolvedValue([]);
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

        it('should throw Forbidden if user is not owner', async () => {
            mockFolderRepository.findById.mockResolvedValue({ ownerId: new Types.ObjectId() });
            await expect(service.getFolders(userId, new Types.ObjectId().toString())).rejects.toThrow(ForbiddenException);
        });
    });

    describe('deleteFolder', () => {
        const userId = 'uid';
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
            await expect(service.deleteFolder(userId, folderId)).rejects.toThrow('Cannot delete folder with subfolders');
        });

        it('should throw BadRequest if it has files', async () => {
            mockFolderRepository.findOne.mockResolvedValue({ _id: folderId, ownerId: userId });
            mockFolderRepository.count.mockResolvedValue(0);
            mockVaultService.countFiles.mockResolvedValue(1);
            await expect(service.deleteFolder(userId, folderId)).rejects.toThrow('Cannot delete folder containing files');
        });
    });

    describe('getFolder', () => {
        it('should build path correctly', async () => {
            const userId = 'u';
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
});
