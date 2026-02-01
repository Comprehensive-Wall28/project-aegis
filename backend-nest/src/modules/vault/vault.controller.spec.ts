import { Test, TestingModule } from '@nestjs/testing';
import { VaultController } from './vault.controller';
import { VaultService } from './vault.service';
import { GridFsService } from './gridfs.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { BadRequestException } from '@nestjs/common';
import { Types } from 'mongoose';
import { Readable } from 'stream';

describe('VaultController', () => {
  let controller: VaultController;
  let vaultService: VaultService;
  let gridFsService: GridFsService;

  const mockVaultService = {
    initiateUpload: jest.fn(),
    uploadChunk: jest.fn(),
    completeGridFsUpload: jest.fn(),
    listFiles: jest.fn(),
    getFile: jest.fn(),
    getDownloadStream: jest.fn(),
    deleteFile: jest.fn(),
    getStorageStats: jest.fn(),
  };

  const mockGridFsService = {
    uploadStream: jest.fn(),
  };

  const mockUser = { _id: new Types.ObjectId() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [VaultController],
      providers: [
        {
          provide: VaultService,
          useValue: mockVaultService,
        },
        {
          provide: GridFsService,
          useValue: mockGridFsService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<VaultController>(VaultController);
    vaultService = module.get<VaultService>(VaultService);
    gridFsService = module.get<GridFsService>(GridFsService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('initUpload', () => {
    it('should call initiateUpload', async () => {
      const body: any = {
        fileName: 'test.txt',
        originalFileName: 'test.txt',
        fileSize: 100,
        mimeType: 'text/plain',
        encryptedSymmetricKey: 'key',
        encapsulatedKey: 'enc_key',
      };
      const mockReq = {} as any;
      await controller.initUpload(mockUser, body, mockReq);
      expect(vaultService.initiateUpload).toHaveBeenCalledWith(
        mockUser._id.toString(),
        body,
        mockReq,
      );
    });
  });

  describe('uploadChunk', () => {
    it('should call uploadChunk with valid query and headers', async () => {
      const mockReq = {
        headers: {
          'content-length': '10',
          'content-range': 'bytes 0-9/100',
        },
        raw: new Readable(),
      };

      await controller.uploadChunk(mockUser, 'file_id', mockReq as any);

      expect(vaultService.uploadChunk).toHaveBeenCalledWith(
        mockUser._id.toString(),
        'file_id',
        mockReq.raw,
        10,
        0,
        9,
        100,
      );
    });

    it('should throw BadRequestException if fileId or range is missing', async () => {
      const mockReq = { headers: {} };
      await expect(
        controller.uploadChunk(mockUser, undefined as any, mockReq as any),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('uploadGridFs', () => {
    it('should handle multipart upload for GridFS', async () => {
      const gridFsId = new Types.ObjectId();
      mockGridFsService.uploadStream.mockResolvedValue(gridFsId);

      const mockReq = {
        parts: async function* () {
          yield { type: 'field', fieldname: 'fileId', value: 'file_id' };
          yield { type: 'file', file: new Readable(), filename: 'test.txt' };
        },
      };

      const result = await controller.uploadGridFs(mockUser, mockReq as any);

      expect(gridFsService.uploadStream).toHaveBeenCalled();
      expect(vaultService.completeGridFsUpload).toHaveBeenCalledWith(
        mockUser._id.toString(),
        'file_id',
        gridFsId,
      );
      expect(result).toEqual({ success: true });
    });
  });

  describe('listFiles', () => {
    it('should call listFiles', async () => {
      await controller.listFiles(mockUser, 'folder_id', 'search_term');
      expect(vaultService.listFiles).toHaveBeenCalledWith(
        mockUser._id.toString(),
        'folder_id',
        'search_term',
      );
    });
  });

  describe('getFile', () => {
    it('should call getFile', async () => {
      await controller.getFile(mockUser, 'file_id');
      expect(vaultService.getFile).toHaveBeenCalledWith(
        mockUser._id.toString(),
        'file_id',
      );
    });
  });

  describe('downloadFile', () => {
    it('should pipe download stream to response', async () => {
      const mockStream = new Readable();
      mockVaultService.getDownloadStream.mockResolvedValue({
        stream: mockStream,
        mimeType: 'text/plain',
        fileName: 'test.txt',
      });

      const mockRes = {
        header: jest.fn().mockReturnThis(),
        send: jest.fn().mockReturnThis(),
      };

      await controller.downloadFile(mockUser, 'file_id', mockRes as any);

      expect(mockRes.header).toHaveBeenCalledWith('Content-Type', 'text/plain');
      expect(mockRes.header).toHaveBeenCalledWith(
        'Content-Disposition',
        expect.stringContaining('test.txt'),
      );
      expect(mockRes.send).toHaveBeenCalledWith(mockStream);
    });
  });

  describe('deleteFile', () => {
    it('should call deleteFile with request for auditing', async () => {
      const mockReq = {} as any;
      await controller.deleteFile(mockUser, 'file_id', mockReq);
      expect(vaultService.deleteFile).toHaveBeenCalledWith(
        mockUser._id.toString(),
        'file_id',
        mockReq,
      );
    });
  });

  describe('getStorageStats', () => {
    it('should call getStorageStats', async () => {
      await controller.getStorageStats(mockUser);
      expect(vaultService.getStorageStats).toHaveBeenCalledWith(
        mockUser._id.toString(),
      );
    });
  });
});
