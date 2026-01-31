import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { NoteRepository } from './note.repository';
import { Note } from '../schemas/note.schema';
import { Model, Types } from 'mongoose';

describe('NoteRepository', () => {
    let repository: NoteRepository;
    let model: Model<any>;
    const userId = new Types.ObjectId().toString();
    const folderId = new Types.ObjectId().toString();

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
            await repository.findByUserId(userId);
            expect(mockNoteModel.find).toHaveBeenCalledWith(expect.objectContaining({
                userId: new Types.ObjectId(userId)
            }));
        });
    });

    describe('getUniqueTags', () => {
        it('should call distinct', async () => {
            mockNoteModel.distinct.mockReturnValue({
                exec: jest.fn().mockResolvedValue(['tag']),
            });
            const result = await repository.getUniqueTags(userId);
            expect(result).toEqual(['tag']);
            expect(mockNoteModel.distinct).toHaveBeenCalledWith('tags', {
                userId: new Types.ObjectId(userId)
            });
        });
    });

    describe('moveNotesToRoot', () => {
        it('should call updateMany', async () => {
            mockNoteModel.updateMany.mockReturnValue({
                exec: jest.fn().mockResolvedValue({}),
            });
            await repository.moveNotesToRoot(userId, folderId);
            expect(mockNoteModel.updateMany).toHaveBeenCalledWith(
                {
                    userId: new Types.ObjectId(userId),
                    noteFolderId: new Types.ObjectId(folderId)
                },
                { $set: { noteFolderId: null } }
            );
        });
    });
});
