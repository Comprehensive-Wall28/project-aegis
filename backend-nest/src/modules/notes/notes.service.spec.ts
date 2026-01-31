import { Test, TestingModule } from '@nestjs/testing';
import { NotesService } from './notes.service';
import { NoteRepository } from './repositories/note.repository';
import { GridFsService } from '../vault/gridfs.service';
import { NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';

describe('NotesService', () => {
    let service: NotesService;
    let noteRepository: NoteRepository;
    let gridFsService: GridFsService;

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
        deleteFile: jest.fn().mockResolvedValue(undefined),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                NotesService,
                { provide: NoteRepository, useValue: mockNoteRepository },
                { provide: GridFsService, useValue: mockGridFsService },
            ],
        }).compile();

        service = module.get<NotesService>(NotesService);
        noteRepository = module.get<NoteRepository>(NoteRepository);
        gridFsService = module.get<GridFsService>(GridFsService);
        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('create', () => {
        it('should create a note and upload content to GridFS', async () => {
            const userId = new Types.ObjectId().toString();
            const createDto = {
                encryptedContent: Buffer.from('test').toString('base64'),
                encryptedTitle: 'title',
                noteFolderId: new Types.ObjectId().toString(),
                encapsulatedKey: 'enc',
                encryptedSymmetricKey: 'sym',
                recordHash: 'hash',
            };
            mockGridFsService.uploadBuffer.mockResolvedValue('gridfs_id');
            mockNoteRepository.create.mockResolvedValue({ ...createDto, _id: 'note_id' });

            const result = await service.create(userId, createDto);

            expect(gridFsService.uploadBuffer).toHaveBeenCalled();
            expect(noteRepository.create).toHaveBeenCalledWith(expect.objectContaining({
                gridFsFileId: 'gridfs_id',
            }));
            expect(result).toBeDefined();
        });
    });

    describe('getContent', () => {
        it('should return buffer and note', async () => {
            const userId = 'user_id';
            const noteId = 'note_id';
            const mockNote = { _id: noteId, gridFsFileId: 'gridfs_id' };
            mockNoteRepository.findOne.mockResolvedValue(mockNote);
            mockGridFsService.downloadToBuffer.mockResolvedValue(Buffer.from('content'));

            const result = await service.getContent(noteId, userId);

            expect(result.buffer.toString()).toBe('content');
            expect(result.note).toBe(mockNote);
        });
    });

    describe('updateContent', () => {
        const userId = 'user_id';
        const noteId = 'note_id';
        const updateDto = {
            encryptedContent: Buffer.from('new content').toString('base64'),
            encapsulatedKey: 'new_enc',
            encryptedSymmetricKey: 'new_sym',
            recordHash: 'new_hash',
        };

        it('should update content and cleanup old file', async () => {
            const mockNote = { _id: noteId, gridFsFileId: 'old_file_id' };
            mockNoteRepository.findOne.mockResolvedValue(mockNote);
            mockGridFsService.uploadBuffer.mockResolvedValue('new_file_id');
            mockNoteRepository.updateOne.mockResolvedValue({ ...mockNote, gridFsFileId: 'new_file_id' });

            const result = await service.updateContent(noteId, userId, updateDto);

            expect(gridFsService.uploadBuffer).toHaveBeenCalled();
            expect(gridFsService.deleteFile).toHaveBeenCalledWith('old_file_id');
            expect(result.gridFsFileId).toBe('new_file_id');
        });

        it('should cleanup new file and throw if update fails', async () => {
            const mockNote = { _id: noteId, gridFsFileId: 'old_file_id' };
            mockNoteRepository.findOne.mockResolvedValue(mockNote);
            mockGridFsService.uploadBuffer.mockResolvedValue('new_file_id');
            mockNoteRepository.updateOne.mockResolvedValue(null);

            await expect(service.updateContent(noteId, userId, updateDto)).rejects.toThrow(NotFoundException);
            expect(gridFsService.deleteFile).toHaveBeenCalledWith('new_file_id');
        });
    });

    describe('remove', () => {
        it('should remove note and delete GridFS file', async () => {
            const userId = 'user_id';
            const noteId = 'note_id';
            const mockNote = { _id: noteId, gridFsFileId: 'file_id' };
            mockNoteRepository.findOne.mockResolvedValue(mockNote);

            await service.remove(noteId, userId);

            expect(noteRepository.deleteOne).toHaveBeenCalled();
            expect(gridFsService.deleteFile).toHaveBeenCalledWith('file_id');
        });
    });
});
