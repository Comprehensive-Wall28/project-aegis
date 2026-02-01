import { Test, TestingModule } from '@nestjs/testing';
import { ImageProxyService } from './image-proxy.service';
import { CachedImageRepository } from './repositories/cached-image.repository';
import { GridFsService } from '../vault/gridfs.service';
import {
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { Types } from 'mongoose';
import { Readable } from 'stream';

// Mock axios
jest.mock('axios');
import axios from 'axios';

describe('ImageProxyService', () => {
  let service: ImageProxyService;
  let cachedImageRepo: jest.Mocked<CachedImageRepository>;
  let gridFsService: jest.Mocked<GridFsService>;

  const mockFileId = new Types.ObjectId();
  const mockCachedImage = {
    url: 'https://example.com/image.jpg',
    fileId: mockFileId,
    contentType: 'image/jpeg',
    size: 1024,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ImageProxyService,
        {
          provide: CachedImageRepository,
          useValue: {
            findByUrl: jest.fn(),
            createAsync: jest.fn(),
          },
        },
        {
          provide: GridFsService,
          useValue: {
            getFileStreamFromBucket: jest.fn(),
            uploadBufferToBucket: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<ImageProxyService>(ImageProxyService);
    cachedImageRepo = module.get(CachedImageRepository);
    gridFsService = module.get(GridFsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('proxyImage', () => {
    it('should return cached image if exists', async () => {
      const mockStream = new Readable();
      cachedImageRepo.findByUrl.mockResolvedValue(mockCachedImage as any);
      gridFsService.getFileStreamFromBucket.mockReturnValue(mockStream);

      const result = await service.proxyImage('https://example.com/image.jpg');

      expect(cachedImageRepo.findByUrl).toHaveBeenCalledWith(
        'https://example.com/image.jpg',
      );
      expect(gridFsService.getFileStreamFromBucket).toHaveBeenCalledWith(
        mockFileId,
        'linkImages',
      );
      expect(result.stream).toBe(mockStream);
      expect(result.contentType).toBe('image/jpeg');
    });

    it('should throw BadRequestException for empty URL', async () => {
      await expect(service.proxyImage('')).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for invalid URL', async () => {
      await expect(service.proxyImage('not-a-url')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException for invalid protocol', async () => {
      await expect(
        service.proxyImage('ftp://example.com/image.jpg'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for private IP (127.0.0.1)', async () => {
      cachedImageRepo.findByUrl.mockResolvedValue(null);

      await expect(
        service.proxyImage('http://127.0.0.1/image.jpg'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for private IP (10.x.x.x)', async () => {
      cachedImageRepo.findByUrl.mockResolvedValue(null);

      await expect(
        service.proxyImage('http://10.0.0.1/image.jpg'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for private IP (192.168.x.x)', async () => {
      cachedImageRepo.findByUrl.mockResolvedValue(null);

      await expect(
        service.proxyImage('http://192.168.1.1/image.jpg'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for link-local IP (169.254.x.x)', async () => {
      cachedImageRepo.findByUrl.mockResolvedValue(null);

      await expect(
        service.proxyImage('http://169.254.1.1/image.jpg'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should fetch and cache new image on cache miss', async () => {
      cachedImageRepo.findByUrl.mockResolvedValue(null);

      const mockStream = new Readable();
      mockStream.push('image data');
      mockStream.push(null);

      const mockResponse = {
        data: mockStream,
        headers: { 'content-type': 'image/png' },
      };

      (axios as any).mockResolvedValue(mockResponse);
      gridFsService.uploadBufferToBucket.mockResolvedValue(mockFileId);

      const result = await service.proxyImage(
        'https://example.com/new-image.png',
      );

      expect(result.contentType).toBe('image/png');
      expect(result.stream).toBeDefined();
    });

    it('should default to image/png for non-image content-type', async () => {
      cachedImageRepo.findByUrl.mockResolvedValue(null);

      const mockStream = new Readable();
      mockStream.push('data');
      mockStream.push(null);

      const mockResponse = {
        data: mockStream,
        headers: { 'content-type': 'text/html' },
      };

      (axios as any).mockResolvedValue(mockResponse);
      gridFsService.uploadBufferToBucket.mockResolvedValue(mockFileId);

      const result = await service.proxyImage('https://example.com/page.html');

      expect(result.contentType).toBe('image/png');
    });

    it('should retry on 502 error', async () => {
      cachedImageRepo.findByUrl.mockResolvedValue(null);

      const error502 = new Error('Bad Gateway');
      (error502 as any).response = { status: 502 };

      const mockStream = new Readable();
      mockStream.push('image data');
      mockStream.push(null);

      const mockResponse = {
        data: mockStream,
        headers: { 'content-type': 'image/jpeg' },
      };

      (axios as any)
        .mockRejectedValueOnce(error502)
        .mockResolvedValueOnce(mockResponse);

      gridFsService.uploadBufferToBucket.mockResolvedValue(mockFileId);

      const result = await service.proxyImage('https://example.com/image.jpg');

      expect(axios).toHaveBeenCalledTimes(2);
      expect(result.contentType).toBe('image/jpeg');
    });

    it('should throw InternalServerErrorException after max retries', async () => {
      cachedImageRepo.findByUrl.mockResolvedValue(null);

      const error502 = new Error('Bad Gateway');
      (error502 as any).response = { status: 502 };

      (axios as any).mockRejectedValue(error502);

      await expect(
        service.proxyImage('https://example.com/image.jpg'),
      ).rejects.toThrow(InternalServerErrorException);

      expect(axios).toHaveBeenCalledTimes(3); // Initial + 2 retries
    }, 15000);
  });
});
