import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { LinkPostRepository } from './link-post.repository';
import { LinkPost } from '../schemas/link-post.schema';
import { Model, Types } from 'mongoose';

describe('LinkPostRepository', () => {
  let repository: LinkPostRepository;
  let model: jest.Mocked<Model<LinkPost>>;

  const mockLinkPost = {
    _id: new Types.ObjectId(),
    collectionId: new Types.ObjectId(),
    userId: new Types.ObjectId(),
    url: 'https://example.com',
    previewData: {
      title: 'Example',
      scrapeStatus: 'success',
    },
    createdAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LinkPostRepository,
        {
          provide: getModelToken(LinkPost.name),
          useValue: {
            find: jest.fn(),
            findOne: jest.fn(),
            findById: jest.fn(),
            findByIdAndUpdate: jest.fn(),
            deleteOne: jest.fn(),
            deleteMany: jest.fn(),
            countDocuments: jest.fn(),
            aggregate: jest.fn(),
          },
        },
      ],
    }).compile();

    repository = module.get<LinkPostRepository>(LinkPostRepository);
    model = module.get(getModelToken(LinkPost.name));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findByCollectionCursor', () => {
    it('should return paginated links', async () => {
      const mockLinks = [mockLinkPost];
      const mockQuery = {
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        populate: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(mockLinks),
      };

      (model.find as jest.Mock).mockReturnValue(mockQuery);
      (model.countDocuments as jest.Mock).mockReturnValue({
        exec: jest.fn().mockResolvedValue(10),
      });

      const result = await repository.findByCollectionCursor(mockLinkPost.collectionId.toString(), 12);

      expect(result.links).toEqual(mockLinks);
      expect(result.totalCount).toBe(10);
      expect(model.find).toHaveBeenCalled();
    });

    it('should handle cursor pagination', async () => {
      const cursor = {
        createdAt: new Date('2026-01-01'),
        id: new Types.ObjectId().toString(),
      };

      const mockQuery = {
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        populate: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([]),
      };

      (model.find as jest.Mock).mockReturnValue(mockQuery);
      (model.countDocuments as jest.Mock).mockReturnValue({
        exec: jest.fn().mockResolvedValue(0),
      });

      await repository.findByCollectionCursor(
        mockLinkPost.collectionId.toString(),
        12,
        cursor,
      );

      const callArgs = (model.find as jest.Mock).mock.calls[0][0];
      expect(callArgs.$or).toBeDefined();
      expect(callArgs.$or.length).toBe(2);
    });
  });

  describe('findByCollectionAndUrl', () => {
    it('should find link by collection and URL', async () => {
      const mockQuery = {
        exec: jest.fn().mockResolvedValue(mockLinkPost),
      };

      (model.findOne as jest.Mock).mockReturnValue(mockQuery);

      const result = await repository.findByCollectionAndUrl(
        mockLinkPost.collectionId.toString(),
        mockLinkPost.url,
      );

      expect(result).toEqual(mockLinkPost);
      expect(model.findOne).toHaveBeenCalledWith(
        expect.objectContaining({
          url: mockLinkPost.url,
        }),
      );
    });
  });

  describe('searchLinks', () => {
    it('should search links with regex', async () => {
      const mockQuery = {
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        populate: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([mockLinkPost]),
      };

      (model.find as jest.Mock).mockReturnValue(mockQuery);

      const result = await repository.searchLinks(
        [mockLinkPost.collectionId.toString()],
        'example',
        50,
      );

      expect(result).toEqual([mockLinkPost]);
      const callArgs = (model.find as jest.Mock).mock.calls[0][0];
      expect(callArgs.$or).toBeDefined();
      expect(callArgs.$or.length).toBe(3); // url, title, description
    });

    it('should escape regex special characters', async () => {
      const mockQuery = {
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        populate: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([]),
      };

      (model.find as jest.Mock).mockReturnValue(mockQuery);

      await repository.searchLinks(
        [mockLinkPost.collectionId.toString()],
        'test.*search',
        50,
      );

      const callArgs = (model.find as jest.Mock).mock.calls[0][0];
      const urlRegex = callArgs.$or[0].url.$regex;
      expect(urlRegex).toContain('test\\.\\*search');
    });
  });

  describe('groupCountByCollections', () => {
    it('should aggregate link counts per collection', async () => {
      const mockAggregateResult = [
        { _id: mockLinkPost.collectionId, count: 5 },
      ];

      (model.aggregate as jest.Mock).mockResolvedValue(mockAggregateResult);

      const result = await repository.groupCountByCollections([
        mockLinkPost.collectionId.toString(),
      ]);

      expect(result).toHaveLength(1);
      expect(result[0]._id).toBe(mockLinkPost.collectionId.toString());
      expect(result[0].count).toBe(5);
    });
  });

  describe('deleteById', () => {
    it('should delete link by ID', async () => {
      const mockQuery = {
        exec: jest.fn().mockResolvedValue({ deletedCount: 1 }),
      };

      (model.deleteOne as jest.Mock).mockReturnValue(mockQuery);

      const result = await repository.deleteById(mockLinkPost._id.toString());

      expect(result).toBe(true);
      expect(model.deleteOne).toHaveBeenCalledWith({ _id: mockLinkPost._id.toString() });
    });

    it('should return false if link not found', async () => {
      const mockQuery = {
        exec: jest.fn().mockResolvedValue({ deletedCount: 0 }),
      };

      (model.deleteOne as jest.Mock).mockReturnValue(mockQuery);

      const result = await repository.deleteById(mockLinkPost._id.toString());

      expect(result).toBe(false);
    });
  });
});
