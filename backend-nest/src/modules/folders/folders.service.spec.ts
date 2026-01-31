import { Test, TestingModule } from '@nestjs/testing';
import { FoldersService } from './folders.service';
import { FolderRepository } from './folders.repository';
import { VaultService } from '../vault/vault.service';
import { Types } from 'mongoose';
import { NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';

const mockFolderRepository = () => ({
    findMany: jest.fn(),
    findById: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    updateById: jest.fn(),
    deleteById: jest.fn(),
    count: jest.fn(),
});

describe('FoldersService', () => {
    let service: FoldersService;
    let repository: any;

    const mockVaultService = {
        countFiles: jest.fn().mockResolvedValue(0),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                FoldersService,
                { provide: FolderRepository, useFactory: mockFolderRepository },
                { provide: VaultService, useValue: mockVaultService },
            ],
        }).compile();

        service = module.get<FoldersService>(FoldersService);
        repository = module.get<FolderRepository>(FolderRepository);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('getFolders', () => {
        it('should return root folders', async () => {
            const userId = new Types.ObjectId().toString();
            const expected = [{ name: 'Root' }];
            repository.findMany.mockResolvedValue(expected);

            const result = await service.getFolders(userId);
            expect(result).toEqual(expected);
            expect(repository.findMany).toHaveBeenCalledWith({
                ownerId: new Types.ObjectId(userId),
                parentId: null
            });
        });
    });
});
