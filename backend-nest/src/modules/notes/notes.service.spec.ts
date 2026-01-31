import { Test, TestingModule } from '@nestjs/testing';
import { NotesService } from './notes.service';
import { NoteRepository } from './repositories/note.repository';
import { GridFsService } from '../vault/gridfs.service';
import { Types } from 'mongoose';

const mockNoteRepository = {
    create: jest.fn(),
    findByUserId: jest.fn(),
    findOne: jest.fn(),
    updateOne: jest.fn(),
    deleteOne: jest.fn(),
};

const mockGridFsService = {
    uploadBuffer: jest.fn(),
    downloadToBuffer: jest.fn(),
    deleteFile: jest.fn(),
};

describe('NotesService', () => {
    let service: NotesService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                NotesService,
                { provide: NoteRepository, useValue: mockNoteRepository },
                { provide: GridFsService, useValue: mockGridFsService },
            ],
        }).compile();

        service = module.get<NotesService>(NotesService);
        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('create', () => {
        it('should create a note with encrypted content', async () => {
            const userId = new Types.ObjectId().toString();
            const mockFileId = new Types.ObjectId();
            const createDto = {
                encapsulatedKey: 'key',
                encryptedSymmetricKey: 'symKey',
                encryptedContent: 'base64content', // Mock base64 content
                recordHash: 'hash',
                tags: [],
                linkedEntityIds: [],
                name: 'test'
            };

            mockGridFsService.uploadBuffer.mockResolvedValue(mockFileId);
            mockNoteRepository.create.mockResolvedValue({
                _id: new Types.ObjectId(),
                ...createDto,
                gridFsFileId: mockFileId,
                contentSize: 10
            });

            const result = await service.create(userId, createDto as any);

            expect(mockGridFsService.uploadBuffer).toHaveBeenCalled();
            expect(mockNoteRepository.create).toHaveBeenCalled();
            expect(result).toBeDefined();
        });
    });

    describe('findOne', () => {
        it('should return a note if found', async () => {
            const userId = 'uid';
            const id = 'nid';
            const mockNote = { _id: id, userId };
            mockNoteRepository.findOne.mockResolvedValue(mockNote);

            const result = await service.findOne(id, userId);
            expect(result).toEqual(mockNote);
        });

        it('should throw NotFoundException if not found', async () => {
            mockNoteRepository.findOne.mockResolvedValue(null);
            await expect(service.findOne('id', 'uid')).rejects.toThrow();
        });
    });
});
