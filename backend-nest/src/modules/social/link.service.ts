import { Injectable, Logger, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { AuditService } from '../../common/services/audit.service';
import { LinkPostRepository } from './repositories/link-post.repository';
import { LinkCommentRepository } from './repositories/link-comment.repository';
import { LinkViewRepository } from './repositories/link-view.repository';
import { LinkMetadataRepository } from './repositories/link-metadata.repository';
import { SocialRepository } from './social.repository';
import { CollectionRepository } from './collection.repository';
import { LinkAccessHelper } from './utils/link-access.helper';
import { ScraperService, ScrapeResult } from './scraper.service';
import { WebsocketGateway } from '../websocket/websocket.gateway';
import { LinkPost } from './schemas/link-post.schema';
import { PostLinkDto } from './dto/link.dto';
import { URL } from 'url';

@Injectable()
export class LinkService {
  private readonly logger = new Logger(LinkService.name);

  constructor(
    private readonly linkPostRepo: LinkPostRepository,
    private readonly linkCommentRepo: LinkCommentRepository,
    private readonly linkViewRepo: LinkViewRepository,
    private readonly linkMetadataRepo: LinkMetadataRepository,
    private readonly socialRepo: SocialRepository,
    private readonly collectionRepo: CollectionRepository,
    private readonly linkAccessHelper: LinkAccessHelper,
    private readonly scraperService: ScraperService,
    private readonly websocketGateway: WebsocketGateway,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Post a new link to a collection
   */
  async postLink(userId: string, roomId: string, data: PostLinkDto, req?: any): Promise<LinkPost> {
    if (!data.url) {
      throw new BadRequestException('URL is required');
    }

    const room = await this.socialRepo.findByIdAndMember(roomId, userId);
    if (!room) {
      throw new NotFoundException('Room not found or access denied');
    }

    let targetCollectionId: string | undefined = data.collectionId;
    if (!targetCollectionId) {
      const defaultCollection = await this.collectionRepo.findDefaultLinksCollection(roomId);
      if (defaultCollection) {
        targetCollectionId = defaultCollection._id.toString();
      } else {
        throw new BadRequestException('No collection found for links');
      }
    }

    // At this point, targetCollectionId is guaranteed to be defined
    if (!targetCollectionId) {
      throw new BadRequestException('Collection ID is required');
    }

    const collection = await this.collectionRepo.findByIdAndRoom(targetCollectionId, roomId);
    if (!collection) {
      throw new NotFoundException('Collection not found');
    }

    let targetUrl = data.url;
    if (!/^https?:\/\//i.test(targetUrl)) {
      targetUrl = 'https://' + targetUrl;
    }

    const existingLink = await this.linkPostRepo.findByCollectionAndUrl(targetCollectionId, targetUrl);
    if (existingLink) {
      throw new BadRequestException('Link already exists in this collection');
    }

    const placeholderPreview = {
      title: targetUrl.split('://')[1] || targetUrl,
      scrapeStatus: 'scraping' as const,
    };

    const linkPost = await this.linkPostRepo.create({
      collectionId: targetCollectionId as any,
      userId: userId as any,
      url: targetUrl,
      previewData: placeholderPreview,
    });

    await (linkPost as any).populate('userId', 'username');

    this.websocketGateway.broadcastToRoom(roomId, 'NEW_LINK', {
      link: linkPost,
      collectionId: targetCollectionId,
    });

    // Background scraping (fire-and-forget)
    this.backgroundScrapeAndBroadcast(linkPost._id.toString(), targetUrl, roomId).catch((err) => {
      this.logger.error(`Background scraping failed: ${err.message}`, err.stack);
    });

    await this.auditService.logAuditEvent(userId, 'LINK_POST', 'SUCCESS', req, {
      roomId,
      linkPostId: linkPost._id.toString(),
    });

    return linkPost;
  }

  /**
   * Delete a link (creator or room owner only)
   */
  async deleteLink(userId: string, linkId: string, req?: any): Promise<void> {
    const { link, roomId, room } = await this.linkAccessHelper.verifyLinkAccess(linkId, userId);

    const isPostCreator = link.userId.toString() === userId;
    const isRoomOwner = room.members.some(
      (m: any) => m.userId.toString() === userId && m.role === 'owner',
    );

    if (!isPostCreator && !isRoomOwner) {
      throw new ForbiddenException('You can only delete your own posts');
    }

    await this.linkPostRepo.deleteById(linkId);
    await this.linkCommentRepo.deleteByLinkId(linkId);
    // Fire-and-forget delete views
    this.linkViewRepo.deleteByLinkIdAsync(linkId);

    this.websocketGateway.broadcastToRoom(roomId, 'LINK_DELETED', {
      linkId,
      collectionId: link.collectionId.toString(),
    });

    await this.auditService.logAuditEvent(userId, 'LINK_DELETE', 'SUCCESS', req, {
      linkId,
      roomId,
    });
  }

  /**
   * Mark a link as viewed (fire-and-forget)
   */
  async markLinkViewed(userId: string, linkId: string): Promise<{ message: string }> {
    const { link, roomId } = await this.linkAccessHelper.verifyLinkAccess(linkId, userId);

    this.linkViewRepo.markViewedAsync(userId, linkId, link.collectionId.toString(), roomId);

    return { message: 'Link marked as viewed' };
  }

  /**
   * Unmark a link as viewed (fire-and-forget)
   */
  async unmarkLinkViewed(userId: string, linkId: string): Promise<{ message: string }> {
    await this.linkAccessHelper.verifyLinkAccess(linkId, userId);

    this.linkViewRepo.unmarkViewedAsync(userId, linkId);

    return { message: 'Link unmarked as viewed' };
  }

  /**
   * Get links for a collection with cursor pagination
   */
  async getCollectionLinks(
    userId: string,
    roomId: string,
    collectionId: string,
    limit: number = 30,
    beforeCursor?: { createdAt: string; id: string },
  ): Promise<{
    links: LinkPost[];
    totalCount: number;
    hasMore: boolean;
    viewedLinkIds: string[];
    commentCounts: Record<string, number>;
  }> {
    const room = await this.socialRepo.findByIdAndMember(roomId, userId);
    if (!room) {
      throw new NotFoundException('Room not found or access denied');
    }

    const collection = await this.collectionRepo.findById(collectionId);
    if (!collection || collection.roomId.toString() !== roomId) {
      throw new NotFoundException('Collection not found');
    }

    const cursor = beforeCursor
      ? {
          createdAt: new Date(beforeCursor.createdAt),
          id: beforeCursor.id,
        }
      : undefined;

    const { links, totalCount } = await this.linkPostRepo.findByCollectionCursor(
      collectionId,
      limit,
      cursor,
    );

    const linkIds = links.map((l) => l._id.toString());
    const [viewedLinkIds, commentCounts] = await Promise.all([
      this.linkViewRepo.findViewedLinkIds(userId, linkIds),
      this.linkCommentRepo.countByLinkIds(linkIds),
    ]);

    return {
      links,
      totalCount,
      hasMore: links.length === limit,
      viewedLinkIds,
      commentCounts,
    };
  }

  /**
   * Search links across room collections
   */
  async searchRoomLinks(
    userId: string,
    roomId: string,
    searchQuery: string,
    limit: number = 50,
  ): Promise<{
    links: LinkPost[];
    viewedLinkIds: string[];
    commentCounts: Record<string, number>;
  }> {
    const room = await this.socialRepo.findByIdAndMember(roomId, userId);
    if (!room) {
      throw new NotFoundException('Room not found or access denied');
    }

    if (!searchQuery || searchQuery.trim() === '') {
      return { links: [], viewedLinkIds: [], commentCounts: {} };
    }

    const collections = await this.collectionRepo.findByRoom(roomId);
    const collectionIds = collections.map((c) => c._id.toString());

    if (collectionIds.length === 0) {
      return { links: [], viewedLinkIds: [], commentCounts: {} };
    }

    const links = await this.linkPostRepo.searchLinks(collectionIds, searchQuery, limit);

    const linkIds = links.map((l) => l._id.toString());
    const [viewedLinkIds, commentCounts] = await Promise.all([
      this.linkViewRepo.findViewedLinkIds(userId, linkIds),
      this.linkCommentRepo.countByLinkIds(linkIds),
    ]);

    return {
      links,
      viewedLinkIds,
      commentCounts,
    };
  }

  /**
   * Fetch link preview with caching
   */
  private async fetchLinkPreview(targetUrl: string): Promise<any> {
    let previewData: any = {
      title: '',
      description: '',
      image: '',
      favicon: '',
      scrapeStatus: 'success',
    };

    try {
      // Check cache
      const cachedMetadata = await this.linkMetadataRepo.findByUrl(targetUrl);
      if (cachedMetadata) {
        return {
          title: cachedMetadata.title,
          description: cachedMetadata.description,
          image: cachedMetadata.image,
          favicon: cachedMetadata.favicon,
          scrapeStatus: cachedMetadata.scrapeStatus || 'success',
        };
      }

      // Fetch fresh
      const scrapeResult: ScrapeResult = await this.scraperService.smartScrape(targetUrl);
      previewData = {
        ...scrapeResult,
        title: scrapeResult.title || '',
        description: scrapeResult.description || '',
        image: scrapeResult.image || '',
        favicon: scrapeResult.favicon || '',
        scrapeStatus: scrapeResult.scrapeStatus,
      };

      // Domain fallback
      if (!previewData.title) {
        try {
          const urlObj = new URL(targetUrl);
          const domain = urlObj.hostname.replace('www.', '');
          previewData.title = domain.charAt(0).toUpperCase() + domain.slice(1);
          if (!previewData.favicon) {
            previewData.favicon = `${urlObj.origin}/favicon.ico`;
          }
        } catch {
          previewData.title = targetUrl;
        }
      }

      // Normalize URLs
      const normalize = (u: string) => {
        if (u && !/^https?:\/\//i.test(u)) {
          try {
            const baseUrl = new URL(targetUrl);
            if (u.startsWith('//')) return baseUrl.protocol + u;
            if (u.startsWith('/')) return baseUrl.origin + u;
            return baseUrl.origin + '/' + u;
          } catch {
            return u;
          }
        }
        return u;
      };

      previewData.image = normalize(previewData.image || '');
      previewData.favicon = normalize(previewData.favicon || '');

      // Cache (fire-and-forget)
      this.linkMetadataRepo.upsertAsync(previewData);
    } catch (error) {
      this.logger.error(`Error fetching link preview for ${targetUrl}:`, error);
      try {
        const urlObj = new URL(targetUrl);
        const domain = urlObj.hostname.replace('www.', '');
        previewData.title = domain.charAt(0).toUpperCase() + domain.slice(1);
        previewData.scrapeStatus = 'failed';
      } catch {
        previewData.title = targetUrl;
        previewData.scrapeStatus = 'failed';
      }
    }

    return previewData;
  }

  /**
   * Background scraping and broadcasting (fire-and-forget)
   */
  private async backgroundScrapeAndBroadcast(
    linkId: string,
    url: string,
    roomId: string,
  ): Promise<void> {
    try {
      const previewData = await this.fetchLinkPreview(url);

      const updated = await this.linkPostRepo.updatePreviewData(linkId, previewData);

      if (updated) {
        this.websocketGateway.broadcastToRoom(roomId, 'LINK_UPDATED', {
          link: updated,
        });
      }
    } catch (error) {
      this.logger.error(`Background scraping failed for link ${linkId}:`, error);
      try {
        const updated = await this.linkPostRepo.updatePreviewData(linkId, {
          scrapeStatus: 'failed',
        });
        if (updated) {
          this.websocketGateway.broadcastToRoom(roomId, 'LINK_UPDATED', {
            link: updated,
          });
        }
      } catch (innerError) {
        this.logger.error(`Final fail-safe for link ${linkId} failed:`, innerError);
      }
    }
  }
}
