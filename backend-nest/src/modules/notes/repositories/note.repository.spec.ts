import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { NoteRepository } from './note.repository';
import { Note } from '../schemas/note.schema';
import { Model } from 'mongoose';

describe('NoteRepository', () => {
    let repository: NoteRepository;
    let model: Model<any>;

    const mockNoteModel = {
        find: jest.fn(),
        distinct: jest.fn(),
        updateMany: jest.fn(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                NoteRepository,
                { provide: getModelToken(Note.name), useValue: mockNoteModel },
            ],
        }).compile();

        repository = module.get<NoteRepository>(NoteRepository);
        model = module.get<Model<any>>(getModelToken(Note.name));
        jest.clearAllMocks();
    });

    describe('findByUserId', () => {
        it('should call find and sort', async () => {
            mockNoteModel.find.mockReturnValue({
                sort: jest.fn().mockReturnThis(),
                exec: jest.fn().mockResolvedValue([]),
            });
            await repository.findByUserId('u');
            expect(mockNoteModel.find).toHaveBeenCalledWith(expect.objectContaining({ userId: 'u' }));
        });
    });

    describe('getUniqueTags', () => {
        it('should call distinct', async () => {
            mockNoteModel.distinct.mockReturnValue({
                exec: jest.fn().mockResolvedValue(['tag']),
            });
            const result = await repository.getUniqueTags('u');
            expect(result).toEqual(['tag']);
            expect(mockNoteModel.distinct).toHaveBeenCalledWith('tags', { userId: 'u' });
        });
    });

    describe('moveNotesToRoot', () => {
        it('should call updateMany', async () => {
            mockNoteModel.updateMany.mockReturnValue({
                exec: jest.fn().mockResolvedValue({}),
            });
            await repository.moveNotesToRoot('u', 'f');
            expect(mockNoteModel.updateMany).toHaveBeenCalledWith(
                { userId: 'u', noteFolderId: 'f' },
                { $set: { noteFolderId: null } }
            );
        });
    });
});
