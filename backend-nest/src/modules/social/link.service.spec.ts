import { Test, TestingModule } from '@nestjs/testing';
import { LinkService } from './link.service';
import { LinkPostRepository } from './repositories/link-post.repository';
import { LinkCommentRepository } from './repositories/link-comment.repository';
import { LinkViewRepository } from './repositories/link-view.repository';
import { LinkMetadataRepository } from './repositories/link-metadata.repository';
import { SocialRepository } from './social.repository';
import { CollectionRepository } from './collection.repository';
import { LinkAccessHelper } from './utils/link-access.helper';
import { ScraperService } from './scraper.service';
import { WebsocketGateway } from '../websocket/websocket.gateway';
import { AuditService } from '../../common/services/audit.service';
import {
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { Types } from 'mongoose';

describe('LinkService', () => {
  let service: LinkService;
  let linkPostRepo: jest.Mocked<LinkPostRepository>;
  let linkCommentRepo: jest.Mocked<LinkCommentRepository>;
  let linkViewRepo: jest.Mocked<LinkViewRepository>;
  let linkMetadataRepo: jest.Mocked<LinkMetadataRepository>;
  let socialRepo: jest.Mocked<SocialRepository>;
  let collectionRepo: jest.Mocked<CollectionRepository>;
  let linkAccessHelper: jest.Mocked<LinkAccessHelper>;
  let scraperService: jest.Mocked<ScraperService>;
  let websocketGateway: jest.Mocked<WebsocketGateway>;
  let auditService: jest.Mocked<AuditService>;

  const mockUserId = new Types.ObjectId().toString();
  const mockRoomId = new Types.ObjectId().toString();
  const mockCollectionId = new Types.ObjectId().toString();
  const mockLinkId = new Types.ObjectId().toString();

  const mockRoom = {
    _id: mockRoomId,
    name: 'Test Room',
    members: [{ userId: mockUserId, role: 'owner' }],
  };

  const mockCollection = {
    _id: mockCollectionId,
    roomId: mockRoomId,
    name: 'Links',
    type: 'links',
  };

  const mockLink = {
    _id: mockLinkId,
    collectionId: mockCollectionId,
    userId: mockUserId,
    url: 'https://example.com',
    previewData: {
      title: 'Example',
      scrapeStatus: 'success',
    },
    populate: jest.fn().mockResolvedValue(this),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LinkService,
        {
          provide: LinkPostRepository,
          useValue: {
            create: jest.fn(),
            findById: jest.fn(),
            findByCollectionCursor: jest.fn(),
            findByCollectionAndUrl: jest.fn(),
            updatePreviewData: jest.fn(),
            deleteById: jest.fn(),
            searchLinks: jest.fn(),
          },
        },
        {
          provide: LinkCommentRepository,
          useValue: {
            deleteByLinkId: jest.fn(),
            countByLinkIds: jest.fn(),
          },
        },
        {
          provide: LinkViewRepository,
          useValue: {
            markViewedAsync: jest.fn(),
            unmarkViewedAsync: jest.fn(),
            deleteByLinkIdAsync: jest.fn(),
            findViewedLinkIds: jest.fn(),
          },
        },
        {
          provide: LinkMetadataRepository,
          useValue: {
            findByUrl: jest.fn(),
            upsertAsync: jest.fn(),
          },
        },
        {
          provide: SocialRepository,
          useValue: {
            findByIdAndMember: jest.fn(),
          },
        },
        {
          provide: CollectionRepository,
          useValue: {
            findDefaultLinksCollection: jest.fn(),
            findByIdAndRoom: jest.fn(),
            findByRoom: jest.fn(),
            findById: jest.fn(),
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
            smartScrape: jest.fn(),
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

    service = module.get<LinkService>(LinkService);
    linkPostRepo = module.get(LinkPostRepository);
    linkCommentRepo = module.get(LinkCommentRepository);
    linkViewRepo = module.get(LinkViewRepository);
    linkMetadataRepo = module.get(LinkMetadataRepository);
    socialRepo = module.get(SocialRepository);
    collectionRepo = module.get(CollectionRepository);
    linkAccessHelper = module.get(LinkAccessHelper);
    scraperService = module.get(ScraperService);
    websocketGateway = module.get(WebsocketGateway);
    auditService = module.get(AuditService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('postLink', () => {
    const postLinkDto = { url: 'https://example.com' };

    it('should create a link with placeholder preview', async () => {
      socialRepo.findByIdAndMember.mockResolvedValue(mockRoom as any);
      collectionRepo.findDefaultLinksCollection.mockResolvedValue(
        mockCollection as any,
      );
      collectionRepo.findByIdAndRoom.mockResolvedValue(mockCollection as any);
      linkPostRepo.findByCollectionAndUrl.mockResolvedValue(null);
      linkPostRepo.create.mockResolvedValue({
        ...mockLink,
        populate: jest.fn().mockReturnThis(),
      } as any);

      const result = await service.postLink(
        mockUserId,
        mockRoomId,
        postLinkDto,
      );

      expect(socialRepo.findByIdAndMember).toHaveBeenCalledWith(
        mockRoomId,
        mockUserId,
      );
      expect(linkPostRepo.findByCollectionAndUrl).toHaveBeenCalledWith(
        mockCollectionId,
        postLinkDto.url,
      );
      expect(linkPostRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          url: postLinkDto.url,
          previewData: expect.objectContaining({
            scrapeStatus: 'scraping',
          }),
        }),
      );
      expect(websocketGateway.broadcastToRoom).toHaveBeenCalledWith(
        mockRoomId,
        'NEW_LINK',
        expect.any(Object),
      );
      expect(auditService.logAuditEvent).toHaveBeenCalled();
    });

    it('should prepend https:// if protocol missing', async () => {
      const urlWithoutProtocol = 'example.com';
      socialRepo.findByIdAndMember.mockResolvedValue(mockRoom as any);
      collectionRepo.findDefaultLinksCollection.mockResolvedValue(
        mockCollection as any,
      );
      collectionRepo.findByIdAndRoom.mockResolvedValue(mockCollection as any);
      linkPostRepo.findByCollectionAndUrl.mockResolvedValue(null);
      linkPostRepo.create.mockResolvedValue({
        ...mockLink,
        populate: jest.fn().mockReturnThis(),
      } as any);

      await service.postLink(mockUserId, mockRoomId, {
        url: urlWithoutProtocol,
      });

      expect(linkPostRepo.findByCollectionAndUrl).toHaveBeenCalledWith(
        mockCollectionId,
        'https://example.com',
      );
    });

    it('should throw BadRequestException if duplicate URL', async () => {
      socialRepo.findByIdAndMember.mockResolvedValue(mockRoom as any);
      collectionRepo.findDefaultLinksCollection.mockResolvedValue(
        mockCollection as any,
      );
      collectionRepo.findByIdAndRoom.mockResolvedValue(mockCollection as any);
      linkPostRepo.findByCollectionAndUrl.mockResolvedValue(mockLink as any);

      await expect(
        service.postLink(mockUserId, mockRoomId, postLinkDto),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException if room not found', async () => {
      socialRepo.findByIdAndMember.mockResolvedValue(null);

      await expect(
        service.postLink(mockUserId, mockRoomId, postLinkDto),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if no default collection', async () => {
      socialRepo.findByIdAndMember.mockResolvedValue(mockRoom as any);
      collectionRepo.findDefaultLinksCollection.mockResolvedValue(null);

      await expect(
        service.postLink(mockUserId, mockRoomId, postLinkDto),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('deleteLink', () => {
    it('should delete link if user is creator', async () => {
      const linkAccessResult = {
        link: { ...mockLink, userId: mockUserId },
        collectionId: mockCollectionId,
        roomId: mockRoomId,
        room: mockRoom,
      };
      linkAccessHelper.verifyLinkAccess.mockResolvedValue(
        linkAccessResult as any,
      );
      linkPostRepo.deleteById.mockResolvedValue(true);
      linkCommentRepo.deleteByLinkId.mockResolvedValue(0);

      await service.deleteLink(mockUserId, mockLinkId);

      expect(linkPostRepo.deleteById).toHaveBeenCalledWith(mockLinkId);
      expect(linkCommentRepo.deleteByLinkId).toHaveBeenCalledWith(mockLinkId);
      expect(linkViewRepo.deleteByLinkIdAsync).toHaveBeenCalledWith(mockLinkId);
      expect(websocketGateway.broadcastToRoom).toHaveBeenCalledWith(
        mockRoomId,
        'LINK_DELETED',
        expect.objectContaining({ linkId: mockLinkId }),
      );
    });

    it('should delete link if user is room owner', async () => {
      const otherUserId = new Types.ObjectId().toString();
      const linkAccessResult = {
        link: { ...mockLink, userId: otherUserId },
        collectionId: mockCollectionId,
        roomId: mockRoomId,
        room: { ...mockRoom, members: [{ userId: mockUserId, role: 'owner' }] },
      };
      linkAccessHelper.verifyLinkAccess.mockResolvedValue(
        linkAccessResult as any,
      );
      linkPostRepo.deleteById.mockResolvedValue(true);
      linkCommentRepo.deleteByLinkId.mockResolvedValue(0);

      await service.deleteLink(mockUserId, mockLinkId);

      expect(linkPostRepo.deleteById).toHaveBeenCalled();
    });

    it('should throw ForbiddenException if not creator or owner', async () => {
      const otherUserId = new Types.ObjectId().toString();
      const linkAccessResult = {
        link: { ...mockLink, userId: otherUserId },
        collectionId: mockCollectionId,
        roomId: mockRoomId,
        room: {
          ...mockRoom,
          members: [{ userId: mockUserId, role: 'member' }],
        },
      };
      linkAccessHelper.verifyLinkAccess.mockResolvedValue(
        linkAccessResult as any,
      );

      await expect(service.deleteLink(mockUserId, mockLinkId)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('markLinkViewed', () => {
    it('should mark link as viewed (fire-and-forget)', async () => {
      const linkAccessResult = {
        link: { ...mockLink, collectionId: mockCollectionId },
        collectionId: mockCollectionId,
        roomId: mockRoomId,
        room: mockRoom,
      };
      linkAccessHelper.verifyLinkAccess.mockResolvedValue(
        linkAccessResult as any,
      );

      const result = await service.markLinkViewed(mockUserId, mockLinkId);

      expect(linkViewRepo.markViewedAsync).toHaveBeenCalledWith(
        mockUserId,
        mockLinkId,
        mockCollectionId,
        mockRoomId,
      );
      expect(result).toEqual({ message: 'Link marked as viewed' });
    });
  });

  describe('unmarkLinkViewed', () => {
    it('should unmark link as viewed (fire-and-forget)', async () => {
      const linkAccessResult = {
        link: mockLink,
        collectionId: mockCollectionId,
        roomId: mockRoomId,
        room: mockRoom,
      };
      linkAccessHelper.verifyLinkAccess.mockResolvedValue(
        linkAccessResult as any,
      );

      const result = await service.unmarkLinkViewed(mockUserId, mockLinkId);

      expect(linkViewRepo.unmarkViewedAsync).toHaveBeenCalledWith(
        mockUserId,
        mockLinkId,
      );
      expect(result).toEqual({ message: 'Link unmarked as viewed' });
    });
  });

  describe('getCollectionLinks', () => {
    it('should return paginated links with metadata', async () => {
      const mockLinks = [mockLink];
      socialRepo.findByIdAndMember.mockResolvedValue(mockRoom as any);
      collectionRepo.findById.mockResolvedValue(mockCollection as any);
      linkPostRepo.findByCollectionCursor.mockResolvedValue({
        links: mockLinks,
        totalCount: 1,
      } as any);
      linkViewRepo.findViewedLinkIds.mockResolvedValue([]);
      linkCommentRepo.countByLinkIds.mockResolvedValue({});

      const result = await service.getCollectionLinks(
        mockUserId,
        mockRoomId,
        mockCollectionId,
        12,
      );

      expect(linkPostRepo.findByCollectionCursor).toHaveBeenCalledWith(
        mockCollectionId,
        12,
        undefined,
      );
      expect(result).toEqual({
        links: mockLinks,
        totalCount: 1,
        hasMore: false,
        viewedLinkIds: [],
        commentCounts: {},
      });
    });

    it('should handle cursor pagination', async () => {
      socialRepo.findByIdAndMember.mockResolvedValue(mockRoom as any);
      collectionRepo.findById.mockResolvedValue(mockCollection as any);
      linkPostRepo.findByCollectionCursor.mockResolvedValue({
        links: [],
        totalCount: 0,
      } as any);
      linkViewRepo.findViewedLinkIds.mockResolvedValue([]);
      linkCommentRepo.countByLinkIds.mockResolvedValue({});

      const cursor = { createdAt: '2026-01-01T00:00:00.000Z', id: mockLinkId };
      await service.getCollectionLinks(
        mockUserId,
        mockRoomId,
        mockCollectionId,
        12,
        cursor,
      );

      expect(linkPostRepo.findByCollectionCursor).toHaveBeenCalledWith(
        mockCollectionId,
        12,
        expect.objectContaining({
          createdAt: expect.any(Date),
          id: mockLinkId,
        }),
      );
    });

    it('should throw NotFoundException if collection not in room', async () => {
      socialRepo.findByIdAndMember.mockResolvedValue(mockRoom as any);
      collectionRepo.findById.mockResolvedValue({
        ...mockCollection,
        roomId: 'other-room',
      } as any);

      await expect(
        service.getCollectionLinks(mockUserId, mockRoomId, mockCollectionId),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('searchRoomLinks', () => {
    it('should search links and return results', async () => {
      const mockLinks = [mockLink];
      socialRepo.findByIdAndMember.mockResolvedValue(mockRoom as any);
      collectionRepo.findByRoom.mockResolvedValue([mockCollection] as any);
      linkPostRepo.searchLinks.mockResolvedValue(mockLinks as any);
      linkViewRepo.findViewedLinkIds.mockResolvedValue([]);
      linkCommentRepo.countByLinkIds.mockResolvedValue({});

      const result = await service.searchRoomLinks(
        mockUserId,
        mockRoomId,
        'example',
        50,
      );

      expect(linkPostRepo.searchLinks).toHaveBeenCalledWith(
        [mockCollectionId],
        'example',
        50,
      );
      expect(result).toEqual({
        links: mockLinks,
        viewedLinkIds: [],
        commentCounts: {},
      });
    });

    it('should return empty results for empty query', async () => {
      socialRepo.findByIdAndMember.mockResolvedValue(mockRoom as any);

      const result = await service.searchRoomLinks(
        mockUserId,
        mockRoomId,
        '',
        50,
      );

      expect(result).toEqual({
        links: [],
        viewedLinkIds: [],
        commentCounts: {},
      });
      expect(linkPostRepo.searchLinks).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException if room not found', async () => {
      socialRepo.findByIdAndMember.mockResolvedValue(null);

      await expect(
        service.searchRoomLinks(mockUserId, mockRoomId, 'test'),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
