import {
  Injectable,
  Logger,
  InternalServerErrorException,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { RoomRepository } from './repositories/room.repository';
import { CollectionRepository } from './repositories/collection.repository';
import { LinkPostRepository } from './repositories/link-post.repository';
import { LinkCommentRepository } from './repositories/link-comment.repository';
import { LinkViewRepository } from './repositories/link-view.repository';
import { ReaderAnnotationRepository } from './repositories/reader-annotation.repository';
import { RoomResponseDto } from './dto/room-response.dto';
import { CreateRoomRequestDto } from './dto/create-room-request.dto';
import { InviteInfoResponseDto } from './dto/invite-info-response.dto';
import { JoinRoomRequestDto } from './dto/join-room-request.dto';
import { CreateCollectionRequestDto } from './dto/create-collection-request.dto';
import { UpdateCollectionRequestDto } from './dto/update-collection-request.dto';
import { ReorderCollectionsRequestDto } from './dto/reorder-collections-request.dto';
import { CollectionResponseDto } from './dto/collection-response.dto';
import { GetCollectionLinksResponseDto } from './dto/get-collection-links-response.dto';
import { PostLinkRequestDto } from './dto/post-link-request.dto';
import { RoomContentResponseDto } from './dto/room-content-response.dto';
import { SearchRoomLinksQueryDto } from './dto/search-room-links-query.dto';
import { SearchRoomLinksResponseDto } from './dto/search-room-links-response.dto';
import { LinkPostDocument } from './schemas/link-post.schema';
import { RoomDocument } from './schemas/room.schema';
import { CollectionDocument } from './schemas/collection.schema';
import { Types } from 'mongoose';
import { randomBytes } from 'crypto';
import { AuditService } from '../audit/audit.service';
import { AuditAction, AuditStatus } from '../audit/schemas/audit-log.schema';
import {
  ScraperService,
  ScrapeResult,
} from './services/scraper/scraper.service';
import { LinkMetadataRepository } from './repositories/link-metadata.repository';
import {
  ReaderContentCacheRepository,
  ReaderContentResult,
} from './repositories/reader-content-cache.repository';

@Injectable()
export class SocialService {
  private readonly logger = new Logger(SocialService.name);

  constructor(
    private readonly roomRepository: RoomRepository,
    private readonly collectionRepository: CollectionRepository,
    private readonly linkPostRepository: LinkPostRepository,
    private readonly linkCommentRepository: LinkCommentRepository,
    private readonly linkViewRepository: LinkViewRepository,
    private readonly readerAnnotationRepository: ReaderAnnotationRepository,
    private readonly auditService: AuditService,
    private readonly scraperService: ScraperService,
    private readonly linkMetadataRepository: LinkMetadataRepository,
    private readonly readerContentCacheRepository: ReaderContentCacheRepository,
  ) {}

  async createRoom(
    userId: string,
    data: CreateRoomRequestDto,
  ): Promise<RoomDocument> {
    if (!data.name || !data.encryptedRoomKey) {
      throw new BadRequestException(
        'Missing required fields: name, encryptedRoomKey',
      );
    }

    const room = await this.roomRepository.create({
      name: data.name,
      description: data.description || '',
      icon: data.icon || '',
      members: [
        {
          userId: new Types.ObjectId(userId),
          role: 'owner',
          encryptedRoomKey: data.encryptedRoomKey,
        },
      ],
    } as any);

    await this.collectionRepository.create({
      roomId: room._id,
      name: '',
      type: 'links',
    } as any);

    return room;
  }

  async getUserRooms(userId: string): Promise<RoomResponseDto[]> {
    try {
      const rooms = await this.roomRepository.findByMember(userId);

      return rooms.map((room) => {
        const member = room.members.find((m) => m.userId.toString() === userId);
        return {
          _id: room._id.toString(),
          name: room.name,
          description: room.description,
          icon: room.icon,
          role: member?.role || 'member',
          encryptedRoomKey: member?.encryptedRoomKey,
        };
      });
    } catch (error) {
      this.logger.error('Get user rooms error:', error);
      throw new InternalServerErrorException('Failed to get rooms');
    }
  }

  async createInvite(
    userId: string,
    roomId: string,
  ): Promise<{ inviteCode: string }> {
    try {
      const room = await this.roomRepository.findByIdAndMember(roomId, userId);
      if (!room) {
        throw new NotFoundException('Room not found');
      }

      const member = room.members.find((m) => m.userId.toString() === userId);
      if (!member || (member.role !== 'owner' && member.role !== 'admin')) {
        throw new ForbiddenException('Permission denied');
      }

      const inviteCode = randomBytes(6).toString('base64url');
      await this.roomRepository.updateInviteCode(roomId, inviteCode);

      return { inviteCode };
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof ForbiddenException
      ) {
        throw error;
      }
      this.logger.error('Create invite error:', error);
      throw new InternalServerErrorException('Failed to create invite');
    }
  }

  async getInviteInfo(inviteCode: string): Promise<InviteInfoResponseDto> {
    try {
      if (!inviteCode) {
        throw new BadRequestException('Invite code required');
      }

      const room = await this.roomRepository.findByInviteCode(inviteCode);
      if (!room) {
        throw new NotFoundException('Invite not found or expired');
      }

      return {
        name: room.name,
        description: room.description,
        icon: room.icon,
      };
    } catch (error) {
      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }
      this.logger.error('Get invite info error:', error);
      throw new InternalServerErrorException('Failed to get invite info');
    }
  }

  async joinRoom(
    userId: string,
    data: JoinRoomRequestDto,
  ): Promise<{ message: string; roomId: string }> {
    try {
      if (!data.inviteCode || !data.encryptedRoomKey) {
        throw new BadRequestException(
          'Missing required fields: inviteCode, encryptedRoomKey',
        );
      }

      const room = await this.roomRepository.findByInviteCode(data.inviteCode);
      if (!room) {
        throw new NotFoundException('Invite not found or expired');
      }

      const existingMember = room.members.find(
        (m) => m.userId.toString() === userId,
      );
      if (existingMember) {
        throw new BadRequestException('Already a member of this room');
      }

      await this.roomRepository.addMember(
        room._id.toString(),
        userId,
        'member',
        data.encryptedRoomKey,
      );

      return {
        message: 'Successfully joined room',
        roomId: room._id.toString(),
      };
    } catch (error) {
      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }
      this.logger.error('Join room error:', error);
      throw new InternalServerErrorException('Failed to join room');
    }
  }

  async leaveRoom(
    userId: string,
    roomId: string,
  ): Promise<{ message: string }> {
    try {
      const room = await this.roomRepository.findByIdAndMember(roomId, userId);
      if (!room) {
        throw new NotFoundException('Room not found or access denied');
      }

      const ownerCount = room.members.filter((m) => m.role === 'owner').length;
      const userMember = room.members.find(
        (m) => m.userId.toString() === userId,
      );

      if (userMember?.role === 'owner' && ownerCount === 1) {
        throw new BadRequestException(
          'Cannot leave room as the last owner. Delete the room instead.',
        );
      }

      await this.roomRepository.removeMember(roomId, userId);

      return { message: 'Successfully left room' };
    } catch (error) {
      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }
      this.logger.error('Leave room error:', error);
      throw new InternalServerErrorException('Failed to leave room');
    }
  }

  async deleteRoom(
    userId: string,
    roomId: string,
  ): Promise<{ message: string }> {
    try {
      const room = await this.roomRepository.findByIdAndMember(roomId, userId);
      if (!room) {
        throw new NotFoundException('Room not found or access denied');
      }

      const member = room.members.find((m) => m.userId.toString() === userId);
      if (!member || member.role !== 'owner') {
        throw new ForbiddenException('Only room owners can delete rooms');
      }

      const collections = await this.collectionRepository.findByRoom(roomId);
      const collectionIds = collections.map((c) => c._id.toString());

      const links =
        await this.linkPostRepository.findByCollections(collectionIds);
      const linkIds = links.map((l) => l._id.toString());

      await Promise.all([
        ...linkIds.map((linkId) =>
          this.linkCommentRepository.deleteByLinkId(linkId),
        ),
        this.readerAnnotationRepository.deleteByRoom(roomId),
        this.linkViewRepository.deleteByRoom(roomId),
      ]);

      if (collectionIds.length > 0) {
        await Promise.all(
          collectionIds.map((cid) =>
            this.linkPostRepository.deleteByCollection(cid),
          ),
        );
      }

      await this.collectionRepository.deleteByRoom(roomId);

      await this.roomRepository.deleteById(roomId);

      return { message: 'Successfully deleted room' };
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof ForbiddenException
      ) {
        throw error;
      }
      this.logger.error('Delete room error:', error);
      throw new InternalServerErrorException('Failed to delete room');
    }
  }

  async createCollection(
    userId: string,
    roomId: string,
    data: CreateCollectionRequestDto,
  ): Promise<CollectionResponseDto> {
    try {
      if (!data.name) {
        throw new BadRequestException('Collection name is required');
      }

      const room = await this.roomRepository.findByIdAndMember(roomId, userId);
      if (!room) {
        throw new ForbiddenException('Room not found or not a member');
      }

      const currentCount = await this.collectionRepository.countByRoom(roomId);

      const collection = await this.collectionRepository.create({
        roomId: new Types.ObjectId(roomId),
        name: data.name,
        order: currentCount,
        type: data.type || 'links',
      } as any);

      return {
        _id: collection._id.toString(),
        roomId: collection.roomId.toString(),
        name: collection.name,
        order: collection.order,
        type: collection.type,
        createdAt: (collection as any).createdAt,
        updatedAt: (collection as any).updatedAt,
      };
    } catch (error) {
      if (
        error instanceof BadRequestException ||
        error instanceof ForbiddenException
      ) {
        throw error;
      }
      this.logger.error('Create collection error:', error);
      throw new InternalServerErrorException('Failed to create collection');
    }
  }

  async deleteCollection(
    userId: string,
    collectionId: string,
  ): Promise<{ message: string }> {
    try {
      const collection = await this.collectionRepository.findById(collectionId);
      if (!collection) {
        throw new NotFoundException('Collection not found');
      }

      const room = await this.roomRepository.findById(
        collection.roomId.toString(),
      );
      if (!room) {
        throw new NotFoundException('Room not found');
      }

      const member = room.members.find((m) => m.userId.toString() === userId);
      if (!member || (member.role !== 'owner' && member.role !== 'admin')) {
        throw new ForbiddenException(
          'Only room owner or admin can delete collections',
        );
      }

      // Delete all links in collection
      await this.linkPostRepository.deleteByCollection(collectionId);

      // Delete collection
      await this.collectionRepository.deleteById(collectionId);

      return { message: 'Collection deleted successfully' };
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof ForbiddenException
      ) {
        throw error;
      }
      this.logger.error('Delete collection error:', error);
      throw new InternalServerErrorException('Failed to delete collection');
    }
  }

  async updateCollection(
    userId: string,
    collectionId: string,
    data: UpdateCollectionRequestDto,
  ): Promise<CollectionResponseDto> {
    try {
      if (!data.name) {
        throw new BadRequestException('Collection name is required');
      }

      const collection = await this.collectionRepository.findById(collectionId);
      if (!collection) {
        throw new NotFoundException('Collection not found');
      }

      const room = await this.roomRepository.findById(
        collection.roomId.toString(),
      );
      if (!room) {
        throw new NotFoundException('Room not found');
      }

      const member = room.members.find((m) => m.userId.toString() === userId);
      if (!member || (member.role !== 'owner' && member.role !== 'admin')) {
        throw new ForbiddenException(
          'Only room owner or admin can update collections',
        );
      }

      const updatedCollection = await this.collectionRepository.updateById(
        collectionId,
        {
          $set: { name: data.name },
        } as any,
      );

      if (!updatedCollection) {
        throw new InternalServerErrorException('Failed to update collection');
      }

      return {
        _id: updatedCollection._id.toString(),
        roomId: updatedCollection.roomId.toString(),
        name: updatedCollection.name,
        order: updatedCollection.order,
        type: updatedCollection.type,
        createdAt: (updatedCollection as any).createdAt,
        updatedAt: (updatedCollection as any).updatedAt,
      };
    } catch (error) {
      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException ||
        error instanceof ForbiddenException
      ) {
        throw error;
      }
      this.logger.error('Update collection error:', error);
      throw new InternalServerErrorException('Failed to update collection');
    }
  }

  async reorderCollections(
    userId: string,
    roomId: string,
    data: ReorderCollectionsRequestDto,
  ): Promise<{ message: string }> {
    try {
      const room = await this.roomRepository.findByIdAndMember(roomId, userId);
      if (!room) {
        throw new NotFoundException('Room not found or access denied');
      }

      await this.collectionRepository.bulkUpdateOrders(data.collectionIds);

      return { message: 'Collections reordered successfully' };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error('Reorder collections error:', error);
      throw new InternalServerErrorException('Failed to reorder collections');
    }
  }

  async postLink(
    userId: string,
    roomId: string,
    data: PostLinkRequestDto,
  ): Promise<LinkPostDocument> {
    try {
      if (!data.url) {
        throw new BadRequestException('URL is required');
      }

      const room = await this.roomRepository.findByIdAndMember(roomId, userId);
      if (!room) {
        throw new NotFoundException('Room not found or access denied');
      }

      let targetCollectionId = data.collectionId;
      if (!targetCollectionId) {
        const defaultCollection =
          await this.collectionRepository.findDefaultLinksCollection(roomId);
        if (defaultCollection) {
          targetCollectionId = defaultCollection._id.toString();
        } else {
          throw new BadRequestException('No collection found for links');
        }
      }

      const collection = await this.collectionRepository.findByIdAndRoom(
        targetCollectionId,
        roomId,
      );
      if (!collection) {
        throw new NotFoundException('Collection not found');
      }

      let targetUrl = data.url;
      if (!/^https?:\/\//i.test(targetUrl)) {
        targetUrl = 'https://' + targetUrl;
      }

      const existingLink = await this.linkPostRepository.findByCollectionAndUrl(
        targetCollectionId,
        targetUrl,
      );
      if (existingLink) {
        throw new BadRequestException('Link already exists in this collection');
      }

      const placeholderPreview = {
        title: targetUrl.split('://')[1] || targetUrl,
        scrapeStatus: 'scraping',
      };

      const linkPost = await this.linkPostRepository.createWithPopulate({
        collectionId: targetCollectionId,
        userId,
        url: targetUrl,
        previewData: placeholderPreview,
      });

      // Trigger background scraping
      this.backgroundScrapeAndBroadcast(
        linkPost._id.toString(),
        targetUrl,
        roomId,
      );

      return linkPost;
    } catch (error) {
      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }
      this.logger.error('Post link error:', error);
      throw new InternalServerErrorException('Failed to post link');
    }
  }

  async getCollectionLinks(
    userId: string,
    roomId: string,
    collectionId: string,
    limit: number = 12,
    beforeCursor?: { createdAt: string; id: string },
  ): Promise<GetCollectionLinksResponseDto> {
    try {
      const room = await this.roomRepository.findByIdAndMember(roomId, userId);
      if (!room) {
        throw new NotFoundException('Room not found or access denied');
      }

      const collection = await this.collectionRepository.findById(collectionId);
      if (!collection || collection.roomId.toString() !== roomId) {
        throw new NotFoundException('Collection not found');
      }

      const cursor = beforeCursor
        ? {
            createdAt: new Date(beforeCursor.createdAt),
            id: beforeCursor.id,
          }
        : undefined;

      const { links, totalCount } =
        await this.linkPostRepository.findByCollectionCursor(
          collectionId,
          limit,
          cursor,
        );

      const linkIds = links.map((l) => l._id.toString());
      const [viewedLinkIds, commentCounts] = await Promise.all([
        this.linkViewRepository.findViewedLinkIds(userId, linkIds),
        this.linkCommentRepository.countByLinkIds(linkIds),
      ]);

      return {
        links: links.map((link) => ({
          _id: link._id.toString(),
          collectionId: link.collectionId.toString(),
          userId: {
            _id:
              (link.userId as any)?._id?.toString() || link.userId.toString(),
            username: (link.userId as any)?.username || '',
          },
          url: link.url,
          previewData: link.previewData || {
            title: '',
            description: '',
            image: '',
            favicon: '',
            scrapeStatus: '',
          },
          createdAt: (link as any).createdAt?.toISOString() || '',
          updatedAt: (link as any).updatedAt?.toISOString() || '',
        })),
        totalCount,
        hasMore: links.length === limit,
        viewedLinkIds,
        commentCounts,
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error('Get collection links error:', error);
      throw new InternalServerErrorException('Failed to get collection links');
    }
  }

  async getRoomContent(
    userId: string,
    roomId: string,
    targetCollectionId?: string,
  ): Promise<RoomContentResponseDto> {
    try {
      const room = await this.roomRepository.findByIdAndMember(roomId, userId);
      if (!room) {
        throw new NotFoundException('Room not found or access denied');
      }

      const member = room.members.find(
        (mAny: any) => mAny.userId.toString() === userId,
      );

      const [collections, viewedByCollection] = await Promise.all([
        this.collectionRepository.findByRoom(roomId, { sort: { order: 1 } }),
        this.linkViewRepository.findMany(
          {
            userId: { $eq: new Types.ObjectId(userId) as any },
            roomId: { $eq: new Types.ObjectId(roomId) as any },
          } as any,
          {
            select: 'collectionId',
            lean: true,
          },
        ),
      ]);

      const viewedCounts: Record<string, number> = {};
      (viewedByCollection as any[]).forEach((v: any) => {
        if (v.collectionId) {
          const cid = v.collectionId.toString();
          viewedCounts[cid] = (viewedCounts[cid] || 0) + 1;
        }
      });

      const collectionIds = collections.map((c: CollectionDocument) =>
        c._id.toString(),
      );

      let fetchCollectionId =
        collections.length > 0 ? collections[0]._id.toString() : null;
      if (targetCollectionId && collectionIds.includes(targetCollectionId)) {
        fetchCollectionId = targetCollectionId;
      }

      const limit = 12;

      const [collectionStats, initialLinksResult] = await Promise.all([
        this.linkPostRepository.groupCountByCollections(collectionIds),
        fetchCollectionId
          ? this.linkPostRepository.findByCollectionCursor(
              fetchCollectionId,
              limit,
            )
          : Promise.resolve({ links: [], totalCount: 0 }),
      ]);

      const unviewedCounts: Record<string, number> = {};
      collections.forEach(
        (c: CollectionDocument) => (unviewedCounts[c._id.toString()] = 0),
      );

      collectionStats.forEach((stat: { _id: string; count: number }) => {
        const cid = stat._id.toString();
        const total = stat.count;
        const viewed = viewedCounts[cid] || 0;
        unviewedCounts[cid] = Math.max(0, total - viewed);
      });

      const initialLinks = initialLinksResult.links;
      let initialViewedLinkIds: string[] = [];
      let initialCommentCounts: Record<string, number> = {};

      if (initialLinks.length > 0) {
        const initialIds = initialLinks.map((l: LinkPostDocument) =>
          l._id.toString(),
        );
        const [viewed, comments] = await Promise.all([
          this.linkViewRepository.findViewedLinkIds(userId, initialIds),
          this.linkCommentRepository.countByLinkIds(initialIds),
        ]);
        initialViewedLinkIds = viewed;
        initialCommentCounts = comments;
      }

      return {
        room: {
          _id: room._id.toString(),
          name: room.name,
          description: room.description,
          icon: room.icon,
          role: member?.role || 'member',
          encryptedRoomKey: member?.encryptedRoomKey,
        },
        collections: collections.map((c: CollectionDocument) => ({
          _id: c._id.toString(),
          roomId: c.roomId.toString(),
          name: c.name,
          order: c.order,
          type: c.type,
          createdAt: (c as any).createdAt,
          updatedAt: (c as any).updatedAt,
        })),
        links: initialLinks.map((link: LinkPostDocument) => ({
          _id: link._id.toString(),
          collectionId: link.collectionId.toString(),
          userId: {
            _id:
              (link.userId as any)?._id?.toString() || link.userId.toString(),
            username: (link.userId as any)?.username || '',
          },
          url: link.url,
          previewData: link.previewData || {
            title: '',
            description: '',
            image: '',
            favicon: '',
            scrapeStatus: '',
          },
          createdAt: (link as any).createdAt?.toISOString() || '',
          updatedAt: (link as any).updatedAt?.toISOString() || '',
        })),
        viewedLinkIds: initialViewedLinkIds,
        commentCounts: initialCommentCounts,
        unviewedCounts,
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error('Get room content error:', error);
      throw new InternalServerErrorException('Failed to get room content');
    }
  }

  async searchRoomLinks(
    userId: string,
    roomId: string,
    query: SearchRoomLinksQueryDto,
  ): Promise<SearchRoomLinksResponseDto> {
    try {
      const room = await this.roomRepository.findByIdAndMember(roomId, userId);
      if (!room) {
        throw new NotFoundException('Room not found or access denied');
      }

      const collections = await this.collectionRepository.findByRoom(roomId);
      const collectionIds = collections.map((c) => c._id.toString());

      if (collectionIds.length === 0) {
        return { links: [], viewedLinkIds: [], commentCounts: {} };
      }

      const links = await this.linkPostRepository.searchLinks(
        collectionIds,
        query.q,
        query.limit || 50,
      );

      const linkIds = links.map((l) => l._id.toString());
      const [viewedLinkIds, commentCounts] = await Promise.all([
        this.linkViewRepository.findViewedLinkIds(userId, linkIds),
        this.linkCommentRepository.countByLinkIds(linkIds),
      ]);

      return {
        links: links.map((link) => ({
          _id: link._id.toString(),
          collectionId: link.collectionId.toString(),
          userId: {
            _id:
              (link.userId as any)?._id?.toString() || link.userId.toString(),
            username: (link.userId as any)?.username || '',
          },
          url: link.url,
          previewData: link.previewData || {
            title: '',
            description: '',
            image: '',
            favicon: '',
            scrapeStatus: '',
          },
          createdAt: (link as any).createdAt?.toISOString() || '',
          updatedAt: (link as any).updatedAt?.toISOString() || '',
        })),
        viewedLinkIds,
        commentCounts,
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error('Search room links error:', error);
      throw new InternalServerErrorException('Failed to search room links');
    }
  }

  async deleteLink(
    userId: string,
    linkId: string,
    ipAddress: string,
  ): Promise<{ message: string }> {
    try {
      const link = await this.linkPostRepository.findById(linkId);
      if (!link) {
        throw new NotFoundException('Link not found');
      }

      const collection = await this.collectionRepository.findById(
        link.collectionId.toString(),
      );
      if (!collection) {
        throw new NotFoundException('Collection not found');
      }

      const roomId = collection.roomId.toString();
      const room = await this.roomRepository.findById(roomId);
      if (!room) {
        throw new NotFoundException('Room not found');
      }

      const member = room.members.find((m) => m.userId.toString() === userId);
      if (!member) {
        throw new ForbiddenException('Not a member of this room');
      }

      const isPostCreator = link.userId.toString() === userId;
      const isRoomOwner = member.role === 'owner';

      if (!isPostCreator && !isRoomOwner) {
        throw new ForbiddenException(
          'Only post creator or room owner can delete links',
        );
      }

      await this.linkPostRepository.deleteById(linkId);
      await this.linkCommentRepository.deleteByLinkId(linkId);

      // Note: Socket broadcasting not implemented in migration

      await this.auditService.log({
        userId,
        action: AuditAction.LINK_DELETE,
        status: AuditStatus.SUCCESS,
        ipAddress,
        metadata: {
          linkId,
          roomId,
        },
      });

      return { message: 'Link deleted successfully' };
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof ForbiddenException
      ) {
        throw error;
      }
      this.logger.error('Delete link error:', error);
      throw new InternalServerErrorException('Failed to delete link');
    }
  }

  async moveLink(
    userId: string,
    linkId: string,
    collectionId: string,
    ipAddress: string,
  ): Promise<LinkPostDocument> {
    try {
      if (!collectionId) {
        throw new BadRequestException('Target collection ID is required');
      }

      const link = await this.linkPostRepository.findById(linkId);
      if (!link) {
        throw new NotFoundException('Link not found');
      }

      const oldCollection = await this.collectionRepository.findById(
        link.collectionId.toString(),
      );
      if (!oldCollection) {
        throw new NotFoundException('Original collection not found');
      }

      const roomId = oldCollection.roomId.toString();
      const room = await this.roomRepository.findById(roomId);
      if (!room) {
        throw new NotFoundException('Room not found');
      }

      const member = room.members.find((m) => m.userId.toString() === userId);
      if (!member) {
        throw new ForbiddenException('Not a member of this room');
      }

      const targetCollection =
        await this.collectionRepository.findById(collectionId);
      if (!targetCollection) {
        throw new NotFoundException('Target collection not found');
      }

      if (targetCollection.roomId.toString() !== roomId) {
        throw new BadRequestException('Cannot move link to a different room');
      }

      const updated = await this.linkPostRepository.updateCollection(
        linkId,
        collectionId,
      );
      if (!updated) {
        throw new InternalServerErrorException('Failed to move link');
      }

      await updated.populate({ path: 'userId', select: 'username' });

      // Note: Socket broadcasting not implemented in migration

      await this.auditService.log({
        userId,
        action: AuditAction.LINK_MOVE,
        status: AuditStatus.SUCCESS,
        ipAddress,
        metadata: {
          linkId,
          oldCollectionId: link.collectionId.toString(),
          newCollectionId: collectionId,
          roomId,
        },
      });

      return updated;
    } catch (error) {
      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException ||
        error instanceof ForbiddenException
      ) {
        throw error;
      }
      this.logger.error('Move link error:', error);
      throw new InternalServerErrorException('Failed to move link');
    }
  }

  private async fetchLinkPreview(targetUrl: string): Promise<ScrapeResult> {
    let previewData: ScrapeResult = {
      title: '',
      description: '',
      image: '',
      favicon: '',
      scrapeStatus: 'success',
    };

    try {
      // Check cache
      const cachedMetadata =
        await this.linkMetadataRepository.findValidByUrl(targetUrl);
      if (cachedMetadata) {
        return {
          title: cachedMetadata.title,
          description: cachedMetadata.description,
          image: cachedMetadata.image,
          favicon: cachedMetadata.favicon,
          scrapeStatus: (cachedMetadata.scrapeStatus as any) || 'success',
        };
      }

      // Fetch fresh
      const scrapeResult = await this.scraperService.smartScrape(targetUrl);
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
      this.linkMetadataRepository.upsertMetadataAsync(
        targetUrl,
        previewData as any,
      );
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

  async backgroundScrapeAndBroadcast(
    linkId: string,
    url: string,
    roomId: string,
  ): Promise<void> {
    try {
      const previewData = await this.fetchLinkPreview(url);

      const updated = await this.linkPostRepository.updateById(linkId, {
        $set: { previewData },
      } as any);

      if (updated) {
        await updated.populate({ path: 'userId', select: 'username' });
        // Note: Socket broadcasting not implemented in migration
        this.logger.log(`Background scraping completed for link ${linkId}`);
      }
    } catch (error) {
      this.logger.error(
        `Background scraping failed for link ${linkId}:`,
        error,
      );
      try {
        const updated = await this.linkPostRepository.updateById(linkId, {
          $set: { 'previewData.scrapeStatus': 'failed' },
        } as any);
        if (updated) {
          await updated.populate({ path: 'userId', select: 'username' });
          // Note: Socket broadcasting not implemented in migration
        }
      } catch (innerError) {
        this.logger.error(
          `Final fail-safe for link ${linkId} failed:`,
          innerError,
        );
      }
    }
  }

  // Reader Mode Methods

  async getReaderContent(
    userId: string,
    linkId: string,
  ): Promise<
    ReaderContentResult & { annotationCounts: Record<string, number> }
  > {
    try {
      // Verify link access
      const link = await this.linkPostRepository.findById(linkId);
      if (!link) {
        throw new NotFoundException('Link not found');
      }

      const collection = await this.collectionRepository.findById(
        link.collectionId.toString(),
      );
      if (!collection) {
        throw new NotFoundException('Collection not found');
      }

      const room = await this.roomRepository.findByIdAndMember(
        collection.roomId.toString(),
        userId,
      );
      if (!room) {
        throw new ForbiddenException('Room not found or access denied');
      }

      // Check cache first
      const cached = await this.readerContentCacheRepository.findValidByUrl(
        link.url,
      );
      let readerResult: ReaderContentResult;

      if (cached) {
        this.logger.debug(
          `[Social:Reader] Cache HIT for link ${linkId} (${link.url})`,
        );
        readerResult = {
          title: cached.title,
          byline: cached.byline,
          content: cached.content,
          textContent: cached.textContent,
          siteName: cached.siteName,
          status: cached.status as any,
          error: cached.error,
        };
      } else {
        this.logger.log(
          `[Social:Reader] Cache MISS - Fetching fresh for link ${linkId} (${link.url})`,
        );
        readerResult = await this.scraperService.readerScrape(link.url);

        // Cache in background
        this.readerContentCacheRepository.upsertContentAsync(
          link.url,
          readerResult,
        );
      }

      const annotationCounts =
        await this.readerAnnotationRepository.countByParagraphForLink(linkId);

      return {
        ...readerResult,
        annotationCounts,
      };
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof ForbiddenException
      ) {
        throw error;
      }
      this.logger.error('Get reader content error:', error);
      throw new InternalServerErrorException('Failed to get reader content');
    }
  }

  async getAnnotations(userId: string, linkId: string): Promise<any[]> {
    try {
      // Verify link access
      const link = await this.linkPostRepository.findById(linkId);
      if (!link) {
        throw new NotFoundException('Link not found');
      }

      const collection = await this.collectionRepository.findById(
        link.collectionId.toString(),
      );
      if (!collection) {
        throw new NotFoundException('Collection not found');
      }

      await this.roomRepository.findByIdAndMember(
        collection.roomId.toString(),
        userId,
      );

      return this.readerAnnotationRepository.findByLinkId(linkId);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error('Get annotations error:', error);
      throw new InternalServerErrorException('Failed to get annotations');
    }
  }

  async createAnnotation(
    userId: string,
    linkId: string,
    paragraphId: string,
    highlightText: string,
    encryptedContent: string,
    ipAddress: string,
  ): Promise<any> {
    try {
      if (!paragraphId || !highlightText || !encryptedContent) {
        throw new BadRequestException('Missing required fields');
      }

      // Verify link access
      const link = await this.linkPostRepository.findById(linkId);
      if (!link) {
        throw new NotFoundException('Link not found');
      }

      const collection = await this.collectionRepository.findById(
        link.collectionId.toString(),
      );
      if (!collection) {
        throw new NotFoundException('Collection not found');
      }

      const room = await this.roomRepository.findByIdAndMember(
        collection.roomId.toString(),
        userId,
      );
      if (!room) {
        throw new ForbiddenException('Room not found or access denied');
      }

      const roomId = collection.roomId.toString();

      const annotation = await this.readerAnnotationRepository.createAnnotation(
        {
          linkId,
          roomId,
          userId,
          paragraphId,
          highlightText: highlightText.slice(0, 500),
          encryptedContent,
        },
      );

      // Note: Socket broadcasting not implemented in migration

      await this.auditService.log({
        userId,
        action: AuditAction.LINK_COMMENT_ADD,
        status: AuditStatus.SUCCESS,
        ipAddress,
        metadata: {
          linkId,
          roomId,
          annotationId: annotation._id.toString(),
          isAnnotation: true,
        },
      });

      return annotation;
    } catch (error) {
      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException ||
        error instanceof ForbiddenException
      ) {
        throw error;
      }
      this.logger.error('Create annotation error:', error);
      throw new InternalServerErrorException('Failed to create annotation');
    }
  }

  async deleteAnnotation(
    userId: string,
    annotationId: string,
    ipAddress: string,
  ): Promise<void> {
    try {
      const annotation =
        await this.readerAnnotationRepository.findById(annotationId);
      if (!annotation) {
        throw new NotFoundException('Annotation not found');
      }

      // Verify link access
      const link = await this.linkPostRepository.findById(
        annotation.linkId.toString(),
      );
      if (!link) {
        throw new NotFoundException('Link not found');
      }

      const collection = await this.collectionRepository.findById(
        link.collectionId.toString(),
      );
      if (!collection) {
        throw new NotFoundException('Collection not found');
      }

      const room = await this.roomRepository.findById(
        collection.roomId.toString(),
      );
      if (!room) {
        throw new NotFoundException('Room not found');
      }

      const isAnnotationAuthor = annotation.userId.toString() === userId;
      const isRoomOwner = room.members.some(
        (m: any) => m.userId.toString() === userId && m.role === 'owner',
      );

      if (!isAnnotationAuthor && !isRoomOwner) {
        throw new ForbiddenException('Permission denied');
      }

      await this.readerAnnotationRepository.deleteById(annotationId);

      // Note: Socket broadcasting not implemented in migration

      await this.auditService.log({
        userId,
        action: AuditAction.LINK_COMMENT_DELETE,
        status: AuditStatus.SUCCESS,
        ipAddress,
        metadata: {
          annotationId,
          linkId: annotation.linkId.toString(),
          roomId: collection.roomId.toString(),
          isAnnotation: true,
        },
      });
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof ForbiddenException
      ) {
        throw error;
      }
      this.logger.error('Delete annotation error:', error);
      throw new InternalServerErrorException('Failed to delete annotation');
    }
  }
}
