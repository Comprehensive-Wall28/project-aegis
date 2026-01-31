import { Test, TestingModule } from '@nestjs/testing';
import { BaseRepository } from './base.repository';
import { Model, Document } from 'mongoose';
import { getModelToken } from '@nestjs/mongoose';
import { RepositoryError, RepositoryErrorCode } from './types';

// Mock Document and Model
class MockDoc extends Document {
    declare _id: any;
    name!: string;
}

class MockRepo extends BaseRepository<MockDoc> { }

describe('BaseRepository', () => {
    let repo: MockRepo;
    let model: Model<MockDoc>;

    const mockModel = {
        findById: jest.fn(),
        findOne: jest.fn(),
        find: jest.fn(),
        create: jest.fn(),
        findByIdAndUpdate: jest.fn(),
        findOneAndUpdate: jest.fn(),
        updateMany: jest.fn(),
        findByIdAndDelete: jest.fn(),
        deleteMany: jest.fn(),
        countDocuments: jest.fn(),
        exists: jest.fn(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                {
                    provide: 'MockDocModel', // We won't inject this directly into repo usually but via super
                    useValue: mockModel
                }
            ],
        }).compile();

        model = module.get<Model<MockDoc>>('MockDocModel');
        repo = new MockRepo(model);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('findById', () => {
        it('should return a document when found', async () => {
            const id = '507f1f77bcf86cd799439011';
            const expectedDoc = { _id: id, name: 'Test' };
            (mockModel.findById as jest.Mock).mockReturnValue({
                exec: jest.fn().mockResolvedValue(expectedDoc),
                select: jest.fn().mockReturnThis(),
                populate: jest.fn().mockReturnThis(),
            });

            const result = await repo.findById(id);
            expect(result).toEqual(expectedDoc);
            expect(mockModel.findById).toHaveBeenCalledWith(id);
        });

        it('should throw INVALID_ID for bad ID', async () => {
            await expect(repo.findById('bad-id')).rejects.toThrow(RepositoryError);
            await expect(repo.findById('bad-id')).rejects.toHaveProperty('code', RepositoryErrorCode.INVALID_ID);
        });
    });

    describe('create', () => {
        it('should create a document', async () => {
            const doc = { name: 'New' };
            (mockModel.create as jest.Mock).mockResolvedValue(doc);

            const result = await repo.create(doc as any);
            expect(result).toEqual(doc);
        });

        it('should handle duplicate key errors', async () => {
            const error = new Error('Duplicate') as any;
            error.code = 11000;
            (mockModel.create as jest.Mock).mockRejectedValue(error);

            await expect(repo.create({ name: 'Dup' } as any)).rejects.toHaveProperty('code', RepositoryErrorCode.DUPLICATE_KEY);
        });
    });
});
