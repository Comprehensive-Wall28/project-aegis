import { Test, TestingModule } from '@nestjs/testing';
import { BaseRepository } from './base.repository';
import { Model, Document } from 'mongoose';
import { RepositoryError, RepositoryErrorCode } from './types';

class MockDoc extends Document {
  declare _id: any;
  name!: string;
}

class MockRepo extends BaseRepository<MockDoc> {}

describe('BaseRepository', () => {
  let repo: MockRepo;
  let model: Model<MockDoc>;

  const mockQuery = {
    exec: jest.fn(),
    select: jest.fn().mockReturnThis(),
    populate: jest.fn().mockReturnThis(),
    sort: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    lean: jest.fn().mockReturnThis(),
  };

  const mockModel = {
    findById: jest.fn().mockReturnValue(mockQuery),
    findOne: jest.fn().mockReturnValue(mockQuery),
    find: jest.fn().mockReturnValue(mockQuery),
    create: jest.fn(),
    findByIdAndUpdate: jest.fn().mockReturnValue(mockQuery),
    findOneAndUpdate: jest.fn().mockReturnValue(mockQuery),
    updateMany: jest.fn().mockReturnValue(mockQuery),
    findByIdAndDelete: jest.fn().mockReturnValue(mockQuery),
    findOneAndDelete: jest.fn().mockReturnValue(mockQuery),
    deleteMany: jest.fn().mockReturnValue(mockQuery),
    countDocuments: jest.fn().mockReturnValue(mockQuery),
    exists: jest.fn().mockReturnValue(mockQuery),
    aggregate: jest.fn().mockReturnValue(mockQuery),
    bulkWrite: jest.fn(),
    db: {
      startSession: jest.fn().mockResolvedValue({
        startTransaction: jest.fn(),
        commitTransaction: jest.fn(),
        abortTransaction: jest.fn(),
        endSession: jest.fn(),
      }),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: 'MockDocModel',
          useValue: mockModel,
        },
      ],
    }).compile();

    model = module.get<Model<MockDoc>>('MockDocModel');
    repo = new MockRepo(model);
    jest.clearAllMocks();
  });

  describe('findById', () => {
    it('should throw INVALID_ID for bad ID', async () => {
      await expect(repo.findById('bad')).rejects.toThrow(RepositoryError);
    });

    it('should return document', async () => {
      const id = '507f1f77bcf86cd799439011';
      mockQuery.exec.mockResolvedValue({ _id: id, name: 'Test' });
      const result = await repo.findById(id);
      expect(result?.name).toBe('Test');
    });

    it('should handle errors', async () => {
      mockQuery.exec.mockRejectedValue(new Error('DB Error'));
      await expect(repo.findById('507f1f77bcf86cd799439011')).rejects.toThrow(
        RepositoryError,
      );
    });
  });

  describe('findPaginated', () => {
    it('should return items and next cursor', async () => {
      const items = [
        { _id: '1', name: 'A' },
        { _id: '2', name: 'B' },
      ];
      mockQuery.exec.mockResolvedValue(items);
      const result = await repo.findPaginated({}, { limit: 2 });
      expect(result.items).toHaveLength(2);
      expect(result.nextCursor).toBe('2');
    });

    it('should handle cursor and sort', async () => {
      mockQuery.exec.mockResolvedValue([]);
      await repo.findPaginated({}, { limit: 2, cursor: '1', sortOrder: -1 });
      expect(mockModel.find).toHaveBeenCalledWith(
        expect.objectContaining({ _id: { $lt: '1' } }),
      );
    });
  });

  describe('updateOne', () => {
    it('should call findOneAndUpdate', async () => {
      mockQuery.exec.mockResolvedValue({ name: 'Updated' });
      const result = await repo.updateOne({ name: 'Old' }, { name: 'Updated' });
      expect(result?.name).toBe('Updated');
      expect(mockModel.findOneAndUpdate).toHaveBeenCalled();
    });
  });

  describe('bulkWrite', () => {
    it('should sanitize operations', async () => {
      mockModel.bulkWrite.mockResolvedValue({ modifiedCount: 1 });
      const ops: any[] = [
        {
          updateOne: { filter: { name: 'A' }, update: { $set: { name: 'B' } } },
        },
        { deleteOne: { filter: { name: 'C' } } },
      ];
      await repo.bulkWrite(ops);
      expect(mockModel.bulkWrite).toHaveBeenCalled();
    });
  });

  describe('aggregate', () => {
    it('should sanitize pipeline', async () => {
      mockQuery.exec.mockResolvedValue([]);
      const pipeline = [{ $match: { name: 'A' } }, { $sort: { name: 1 } }];
      await repo.aggregate(pipeline);
      expect(mockModel.aggregate).toHaveBeenCalled();
    });
  });

  describe('applyOptions', () => {
    it('should apply all options', async () => {
      mockQuery.exec.mockResolvedValue([]);
      await repo.findMany(
        {},
        {
          sort: { name: 1 },
          limit: 10,
          skip: 5,
          select: 'name',
          lean: true,
          populate: 'ref',
        },
      );
      expect(mockQuery.sort).toHaveBeenCalledWith({ name: 1 });
      expect(mockQuery.limit).toHaveBeenCalledWith(10);
      expect(mockQuery.skip).toHaveBeenCalledWith(5);
      expect(mockQuery.select).toHaveBeenCalled();
      expect(mockQuery.lean).toHaveBeenCalled();
      expect(mockQuery.populate).toHaveBeenCalledWith('ref');
    });

    it('should handle array populate', async () => {
      mockQuery.exec.mockResolvedValue([]);
      await repo.findMany({}, { populate: ['a', 'b'] });
      expect(mockQuery.populate).toHaveBeenCalledTimes(2);
    });
  });
});
