import { Test, TestingModule } from '@nestjs/testing';
import { ReaderService } from './reader.service';
import { ReaderAnnotationRepository } from './repositories/reader-annotation.repository';
import { ReaderContentCacheRepository } from './repositories/reader-content-cache.repository';
import { LinkAccessHelper } from './utils/link-access.helper';
import { ScraperService } from './scraper.service';
import { WebsocketGateway } from '../websocket/websocket.gateway';
import { AuditService } from '../../common/services/audit.service';
import { NotFoundException, ForbiddenException } from '@nestjs/common';

describe('ReaderService', () => {
  let service: ReaderService;
  let annotationRepository: jest.Mocked<ReaderAnnotationRepository>;
  let cacheRepository: jest.Mocked<ReaderContentCacheRepository>;
  let linkAccessHelper: jest.Mocked<LinkAccessHelper>;
  let scraperService: jest.Mocked<ScraperService>;
  let websocketGateway: jest.Mocked<WebsocketGateway>;
  let auditService: jest.Mocked<AuditService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReaderService,
        {
          provide: ReaderAnnotationRepository,
          useValue: {
            create: jest.fn(),
            findByLinkId: jest.fn(),
            countByParagraphForLink: jest.fn(),
            findById: jest.fn(),
            deleteById: jest.fn(),
          },
        },
        {
          provide: ReaderContentCacheRepository,
          useValue: {
            findValidByUrl: jest.fn(),
            upsertContent: jest.fn(),
          },
        },
        {
          provide: LinkAccessHelper,
          useValue: {
            verifyLinkAccess: jest.fn(),
          },
        },
        {
          provide: ScraperService,
          useValue: {
            readerScrape: jest.fn(),
          },
        },
        {
          provide: WebsocketGateway,
          useValue: {
            broadcastToRoom: jest.fn(),
          },
        },
        {
          provide: AuditService,
          useValue: {
            logAuditEvent: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<ReaderService>(ReaderService);
    annotationRepository = module.get(ReaderAnnotationRepository);
    cacheRepository = module.get(ReaderContentCacheRepository);
    linkAccessHelper = module.get(LinkAccessHelper);
    scraperService = module.get(ScraperService);
    websocketGateway = module.get(WebsocketGateway);
    auditService = module.get(AuditService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getReaderContent', () => {
    it('should return cached content if valid cache exists', async () => {
      const mockLink = { url: 'https://example.com' };
      linkAccessHelper.verifyLinkAccess.mockResolvedValue({
        link: mockLink,
      } as any);
      cacheRepository.findValidByUrl.mockResolvedValue({
        title: 'Cached Title',
        content: '<p>Cached Content</p>',
        status: 'success',
      } as any);
      annotationRepository.countByParagraphForLink.mockResolvedValue({ p1: 1 });

      const result = await service.getReaderContent('user1', 'link1');

      expect(result.title).toBe('Cached Title');
      expect(result.annotationCounts).toEqual({ p1: 1 });
      expect(scraperService.readerScrape).not.toHaveBeenCalled();
    });

    it('should scrape and cache if no valid cache exists', async () => {
      const mockLink = { url: 'https://example.com' };
      linkAccessHelper.verifyLinkAccess.mockResolvedValue({
        link: mockLink,
      } as any);
      cacheRepository.findValidByUrl.mockResolvedValue(null);
      scraperService.readerScrape.mockResolvedValue({
        title: 'Scraped Title',
        content: '<p>Scraped Content</p>',
        status: 'success',
      } as any);
      annotationRepository.countByParagraphForLink.mockResolvedValue({});

      const result = await service.getReaderContent('user1', 'link1');

      expect(result.title).toBe('Scraped Title');
      expect(cacheRepository.upsertContent).toHaveBeenCalledWith(
        'https://example.com',
        expect.any(Object),
      );
    });
  });

  describe('createAnnotation', () => {
    it('should create annotation and broadcast event', async () => {
      linkAccessHelper.verifyLinkAccess.mockResolvedValue({
        roomId: 'room1',
      } as any);
      const mockAnnotation = { _id: 'ann1' };
      annotationRepository.create.mockResolvedValue(mockAnnotation as any);

      const result = await service.createAnnotation('user1', 'link1', {
        paragraphId: 'p1',
        highlightText: 'text',
        encryptedContent: 'enc',
      });

      expect(result).toEqual(mockAnnotation);
      expect(websocketGateway.broadcastToRoom).toHaveBeenCalledWith(
        'room1',
        'NEW_ANNOTATION',
        expect.any(Object),
      );
      expect(auditService.logAuditEvent).toHaveBeenCalled();
    });
  });

  describe('deleteAnnotation', () => {
    it('should delete annotation if user is author', async () => {
      const mockAnnotation = { _id: 'ann1', userId: 'user1', linkId: 'link1' };
      annotationRepository.findById.mockResolvedValue(mockAnnotation as any);
      linkAccessHelper.verifyLinkAccess.mockResolvedValue({
        roomId: 'room1',
        room: { members: [] },
      } as any);

      await service.deleteAnnotation('user1', 'ann1');

      expect(annotationRepository.deleteById).toHaveBeenCalledWith('ann1');
      expect(websocketGateway.broadcastToRoom).toHaveBeenCalled();
    });

    it('should throw ForbiddenException if user is not author or owner', async () => {
      const mockAnnotation = { _id: 'ann1', userId: 'user2', linkId: 'link1' };
      annotationRepository.findById.mockResolvedValue(mockAnnotation as any);
      linkAccessHelper.verifyLinkAccess.mockResolvedValue({
        roomId: 'room1',
        room: { members: [{ userId: 'user1', role: 'member' }] },
      } as any);

      await expect(service.deleteAnnotation('user1', 'ann1')).rejects.toThrow(
        ForbiddenException,
      );
    });
  });
});
