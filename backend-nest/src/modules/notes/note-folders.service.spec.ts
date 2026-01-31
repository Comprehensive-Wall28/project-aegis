import { Test, TestingModule } from '@nestjs/testing';
import { NoteFolderService } from './note-folders.service';
import { NoteFolderRepository } from './repositories/note-folder.repository';
import { NoteRepository } from './repositories/note.repository';
import { ConflictException, NotFoundException } from '@nestjs/common';

describe('NoteFolderService', () => {
    let service: NoteFolderService;
    let folderRepository: NoteFolderRepository;
    let noteRepository: NoteRepository;

    const mockFolderRepository = {
        existsWithName: jest.fn(),
        create: jest.fn(),
        findByUserId: jest.fn(),
        findOne: jest.fn(),
        updateOne: jest.fn(),
        deleteOne: jest.fn(),
        getDescendantIds: jest.fn(),
    };

    const mockNoteRepository = {
        moveNotesToRoot: jest.fn(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                NoteFolderService,
                { provide: NoteFolderRepository, useValue: mockFolderRepository },
                { provide: NoteRepository, useValue: mockNoteRepository },
            ],
        }).compile();

        service = module.get<NoteFolderService>(NoteFolderService);
        folderRepository = module.get<NoteFolderRepository>(NoteFolderRepository);
        noteRepository = module.get<NoteRepository>(NoteRepository);
        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('create', () => {
        it('should create a folder if name is unique', async () => {
            const userId = 'user_id';
            const dto = { name: 'Folder', color: '#fff' };
            mockFolderRepository.existsWithName.mockResolvedValue(false);
            mockFolderRepository.create.mockResolvedValue({ ...dto, userId });

            const result = await service.create(userId, dto);

            expect(result.name).toBe('Folder');
            expect(folderRepository.create).toHaveBeenCalled();
        });

        it('should throw ConflictException if folder name exists', async () => {
            mockFolderRepository.existsWithName.mockResolvedValue(true);
            await expect(service.create('u', { name: 'F' })).rejects.toThrow(ConflictException);
        });
    });

    describe('update', () => {
        it('should update folder and check for name conflicts', async () => {
            const folderId = 'fid';
            const userId = 'uid';
            const mockFolder = { _id: folderId, name: 'Old', parentId: null };
            mockFolderRepository.findOne.mockResolvedValue(mockFolder);
            mockFolderRepository.existsWithName.mockResolvedValue(false);
            mockFolderRepository.updateOne.mockResolvedValue({ ...mockFolder, name: 'New' });

            const result = await service.update(folderId, userId, { name: 'New' });

            expect(result.name).toBe('New');
            expect(folderRepository.existsWithName).toHaveBeenCalled();
        });
    });

    describe('remove', () => {
        it('should remove folder and descendants, and move notes to root', async () => {
            const folderId = 'root_folder';
            const userId = 'uid';
            const descendants = ['child1', 'child2'];
            mockFolderRepository.findOne.mockResolvedValue({ _id: folderId });
            mockFolderRepository.getDescendantIds.mockResolvedValue(descendants);

            await service.remove(folderId, userId);

            expect(noteRepository.moveNotesToRoot).toHaveBeenCalledTimes(3); // root + 2 descendants
            expect(folderRepository.deleteOne).toHaveBeenCalledTimes(3);
        });

        it('should throw NotFoundException if folder not found', async () => {
            mockFolderRepository.findOne.mockResolvedValue(null);
            await expect(service.remove('id', 'u')).rejects.toThrow(NotFoundException);
        });
    });
});
