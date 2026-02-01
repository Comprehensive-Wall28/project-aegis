import { Test, TestingModule } from '@nestjs/testing';
import { GridFsService } from './gridfs.service';
import { getConnectionToken } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { GridFSBucket, ObjectId } from 'mongodb';
import { Readable, PassThrough } from 'stream';

// Variables starting with 'mock' are accessible to jest.mock
const mockBucketInstance = {
  openUploadStream: jest.fn(),
  openDownloadStream: jest.fn(),
  delete: jest.fn(),
};

// Mock mongodb before anything else
jest.mock('mongodb', () => {
  const actual = jest.requireActual('mongodb');
  return {
    ...actual,
    GridFSBucket: jest.fn().mockImplementation(() => mockBucketInstance),
  };
});

describe('GridFsService', () => {
  let service: GridFsService;
  let connection: Connection;

  const mockConnection = {
    db: {},
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GridFsService,
        {
          provide: getConnectionToken(),
          useValue: mockConnection,
        },
      ],
    }).compile();

    service = module.get<GridFsService>(GridFsService);
    connection = module.get<Connection>(getConnectionToken());

    // Manual override since constructor might have already run with real GridFSBucket
    // if we didn't mock mongodb correctly
    (service as any).bucket = mockBucketInstance;
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('uploadBuffer', () => {
    it('should upload buffer and return ObjectId', async () => {
      const mockStream = new PassThrough();
      const fileId = new ObjectId();
      (mockStream as any).id = fileId;
      mockBucketInstance.openUploadStream.mockReturnValue(mockStream);

      const resultPromise = service.uploadBuffer(
        Buffer.from('test'),
        'test.txt',
      );

      // Wait for next tick so stream can process
      setImmediate(() => {
        mockStream.emit('finish');
      });

      const result = await resultPromise;
      expect(result).toBe(fileId);
      expect(mockBucketInstance.openUploadStream).toHaveBeenCalledWith(
        'test.txt',
        { metadata: undefined },
      );
    });
  });

  describe('uploadStream', () => {
    it('should upload stream and return ObjectId', async () => {
      const mockUploadStream = new PassThrough();
      const fileId = new ObjectId();
      (mockUploadStream as any).id = fileId;
      mockBucketInstance.openUploadStream.mockReturnValue(mockUploadStream);

      const sourceStream = new Readable({
        read() {
          this.push('test');
          this.push(null);
        },
      });

      const resultPromise = service.uploadStream(sourceStream, 'test.txt');

      setImmediate(() => {
        mockUploadStream.emit('finish');
      });

      const result = await resultPromise;
      expect(result).toBe(fileId);
    });
  });

  describe('downloadToBuffer', () => {
    it('should download to buffer', async () => {
      const mockDownloadStream = new PassThrough();
      mockBucketInstance.openDownloadStream.mockReturnValue(mockDownloadStream);

      const fileId = new ObjectId();
      const resultPromise = service.downloadToBuffer(fileId);

      mockDownloadStream.write('test');
      mockDownloadStream.end();

      const result = await resultPromise;
      expect(result.toString()).toBe('test');
      expect(mockBucketInstance.openDownloadStream).toHaveBeenCalledWith(
        fileId,
      );
    });
  });

  describe('getFileStream', () => {
    it('should return download stream', () => {
      const fileId = new ObjectId();
      service.getFileStream(fileId);
      expect(mockBucketInstance.openDownloadStream).toHaveBeenCalledWith(
        fileId,
      );
    });
  });

  describe('deleteFile', () => {
    it('should call bucket.delete', async () => {
      const fileId = new ObjectId();
      await service.deleteFile(fileId);
      expect(mockBucketInstance.delete).toHaveBeenCalledWith(fileId);
    });
  });
});
