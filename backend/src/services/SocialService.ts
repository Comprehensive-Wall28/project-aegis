import { Request } from 'express';
import { randomBytes } from 'crypto';
import { URL } from 'url';
import { BaseService, ServiceError } from './base/BaseService';
import { RoomRepository } from '../repositories/RoomRepository';
import { CollectionRepository } from '../repositories/CollectionRepository';
import { LinkPostRepository } from '../repositories/LinkPostRepository';
import { LinkViewRepository } from '../repositories/LinkViewRepository';
import { LinkMetadataRepository } from '../repositories/LinkMetadataRepository';
import { LinkCommentRepository } from '../repositories/LinkCommentRepository';
import { IRoom, IRoomMember } from '../models/Room';
import { ICollection } from '../models/Collection';
import { ILinkPost, IPreviewData } from '../models/LinkPost';
import { advancedScrape, smartScrape } from '../utils/scraper';
import logger from '../utils/logger';
import SocketManager from '../utils/SocketManager';

// DTOs
export interface CreateRoomDTO {
    name: string;
    description?: string;
    icon?: string;
    encryptedRoomKey: string;
}

export interface PostLinkDTO {
    url: string;
    collectionId?: string;
}

export interface CreateCollectionDTO {
    name: string;
    type?: 'links' | 'discussion';
}

export interface RoomWithKey {
    _id: string;
    name: string;
    description: string;
    icon: string;
    encryptedRoomKey?: string;
    memberCount: number;
}

export interface RoomContent {
    room: RoomWithKey;
    collections: ICollection[];
    links: ILinkPost[];
    viewedLinkIds: string[];
    commentCounts: Record<string, number>;
    unviewedCounts: Record<string, number>;
}

/**
 * SocialService handles all social/room-related business logic
 */
export class SocialService extends BaseService<IRoom, RoomRepository> {
    private collectionRepo: CollectionRepository;
    private linkPostRepo: LinkPostRepository;
    private linkViewRepo: LinkViewRepository;
    private linkMetadataRepo: LinkMetadataRepository;
    private linkCommentRepo: LinkCommentRepository;

    constructor() {
        super(new RoomRepository());
        this.collectionRepo = new CollectionRepository();
        this.linkPostRepo = new LinkPostRepository();
        this.linkViewRepo = new LinkViewRepository();
        this.linkMetadataRepo = new LinkMetadataRepository();
        this.linkCommentRepo = new LinkCommentRepository();
    }

    // ============== Room Operations ==============

    async createRoom(userId: string, data: CreateRoomDTO, req: Request): Promise<IRoom> {
        try {
            if (!data.name || !data.encryptedRoomKey) {
                throw new ServiceError('Missing required fields: name, encryptedRoomKey', 400);
            }

            const room = await this.repository.create({
                name: data.name,
                description: data.description || '',
                icon: data.icon || '',
                members: [{
                    userId: userId as any,
                    role: 'owner',
                    encryptedRoomKey: data.encryptedRoomKey
                }]
            } as any);

            // Create default Links collection
            await this.collectionRepo.create({
                roomId: room._id,
                name: '',
                type: 'links'
            } as any);

            logger.info(`Room created by user ${userId}`);
            await this.logAction(userId, 'ROOM_CREATE', 'SUCCESS', req, {
                roomId: room._id.toString()
            });

            return room;
        } catch (error) {
            if (error instanceof ServiceError) throw error;
            logger.error('Create room error:', error);
            throw new ServiceError('Failed to create room', 500);
        }
    }

    async getUserRooms(userId: string): Promise<RoomWithKey[]> {
        try {
            const rooms = await this.repository.findByMember(userId);

            return rooms.map(room => {
                const member = room.members.find(m => m.userId.toString() === userId);
                return {
                    _id: room._id.toString(),
                    name: room.name,
                    description: room.description,
                    icon: room.icon,
                    encryptedRoomKey: member?.encryptedRoomKey,
                    memberCount: room.members.length
                };
            });
        } catch (error) {
            logger.error('Get user rooms error:', error);
            throw new ServiceError('Failed to get rooms', 500);
        }
    }

    async createInvite(userId: string, roomId: string, req: Request): Promise<string> {
        try {
            const room = await this.repository.findByIdAndMember(roomId, userId);
            if (!room) {
                throw new ServiceError('Room not found', 404);
            }

            const member = room.members.find(m => m.userId.toString() === userId);
            if (!member || (member.role !== 'owner' && member.role !== 'admin')) {
                throw new ServiceError('Permission denied', 403);
            }

            const inviteCode = randomBytes(6).toString('base64url');
            await this.repository.updateInviteCode(roomId, inviteCode);

            logger.info(`Invite code created for room ${roomId} by user ${userId}`);
            await this.logAction(userId, 'ROOM_INVITE_CREATE', 'SUCCESS', req, { roomId });

            return inviteCode;
        } catch (error) {
            if (error instanceof ServiceError) throw error;
            logger.error('Create invite error:', error);
            throw new ServiceError('Failed to create invite', 500);
        }
    }

    async getInviteInfo(inviteCode: string): Promise<{ name: string; description: string; icon: string }> {
        try {
            if (!inviteCode) {
                throw new ServiceError('Invite code required', 400);
            }

            const room = await this.repository.findByInviteCode(inviteCode);
            if (!room) {
                throw new ServiceError('Invite not found or expired', 404);
            }

            return {
                name: room.name,
                description: room.description,
                icon: room.icon
            };
        } catch (error) {
            if (error instanceof ServiceError) throw error;
            logger.error('Get invite info error:', error);
            throw new ServiceError('Failed to get invite info', 500);
        }
    }

    async joinRoom(
        userId: string,
        inviteCode: string,
        encryptedRoomKey: string,
        req: Request
    ): Promise<string> {
        try {
            if (!inviteCode || !encryptedRoomKey) {
                throw new ServiceError('Missing required fields: inviteCode, encryptedRoomKey', 400);
            }

            const room = await this.repository.findByInviteCode(inviteCode);
            if (!room) {
                throw new ServiceError('Invite not found or expired', 404);
            }

            const existingMember = room.members.find(m => m.userId.toString() === userId);
            if (existingMember) {
                throw new ServiceError('Already a member of this room', 400);
            }

            await this.repository.addMember(room._id.toString(), userId, 'member', encryptedRoomKey);

            logger.info(`User ${userId} joined room ${room._id}`);
            await this.logAction(userId, 'ROOM_JOIN', 'SUCCESS', req, {
                roomId: room._id.toString()
            });

            return room._id.toString();
        } catch (error) {
            if (error instanceof ServiceError) throw error;
            logger.error('Join room error:', error);
            throw new ServiceError('Failed to join room', 500);
        }
    }

    async getRoomContent(userId: string, roomId: string): Promise<RoomContent> {
        const startTime = Date.now();
        try {
            const room = await this.repository.findByIdAndMember(roomId, userId);
            if (!room) {
                throw new ServiceError('Room not found or access denied', 404);
            }

            const member = room.members.find(m => m.userId.toString() === userId);

            // OPTIMIZATION: Run collections and viewedByCollection queries in parallel
            const [collections, viewedByCollection] = await Promise.all([
                this.collectionRepo.findByRoom(roomId),
                // Fetch viewed counts by collection for this user in this room
                // Using the compound index: { roomId: 1, userId: 1, collectionId: 1 }
                this.linkViewRepo.findMany({
                    userId: { $eq: userId as any },
                    roomId: { $eq: roomId as any }
                } as any, {
                    select: 'collectionId',
                    lean: true
                })
            ]);

            const viewedCounts: Record<string, number> = {};
            viewedByCollection.forEach((v: any) => {
                if (v.collectionId) {
                    const cid = v.collectionId.toString();
                    viewedCounts[cid] = (viewedCounts[cid] || 0) + 1;
                }
            });

            // OPTIMIZATION: Run collectionStats and initial links fetch in parallel
            const collectionIds = collections.map(c => c._id.toString());
            const firstCollectionId = collections.length > 0 ? collections[0]._id.toString() : null;
            const limit = 30;

            const [collectionStats, initialLinksResult] = await Promise.all([
                // Get total links per collection in one aggregation
                this.linkPostRepo.groupCountByCollections(collectionIds),
                // Fetch initial links for first collection (or empty if no collections)
                firstCollectionId
                    ? this.linkPostRepo.findByCollectionCursor(firstCollectionId, limit)
                    : Promise.resolve({ links: [], totalCount: 0 })
            ]);

            const unviewedCounts: Record<string, number> = {};
            collections.forEach(c => unviewedCounts[c._id.toString()] = 0);

            collectionStats.forEach((stat: { _id: string; count: number }) => {
                const cid = stat._id.toString();
                const total = stat.count;
                const viewed = viewedCounts[cid] || 0;
                unviewedCounts[cid] = Math.max(0, total - viewed);
            });

            // Get viewed status and comments for initial links
            const initialLinks = initialLinksResult.links;
            let initialViewedLinkIds: string[] = [];
            let initialCommentCounts: Record<string, number> = {};

            if (initialLinks.length > 0) {
                const initialIds = initialLinks.map((l: ILinkPost) => l._id.toString());
                const [viewed, comments] = await Promise.all([
                    this.linkViewRepo.findViewedLinkIds(userId, initialIds),
                    this.linkCommentRepo.countByLinkIds(initialIds)
                ]);
                initialViewedLinkIds = viewed;
                initialCommentCounts = comments;
            }

            const duration = Date.now() - startTime;
            logger.info(`[Performance] getRoomContent for room ${roomId} took ${duration}ms (optimized)`);

            return {
                room: {
                    _id: room._id.toString(),
                    name: room.name,
                    description: room.description,
                    icon: room.icon,
                    encryptedRoomKey: member?.encryptedRoomKey,
                    memberCount: room.members.length
                },
                collections,
                links: initialLinks,
                viewedLinkIds: initialViewedLinkIds,
                commentCounts: initialCommentCounts,
                unviewedCounts
            };
        } catch (error) {
            if (error instanceof ServiceError) throw error;
            logger.error('Get room content error:', error);
            throw new ServiceError('Failed to get room content', 500);
        }
    }

    /**
     * Get links for a specific collection with pagination
     */
    async getCollectionLinks(
        userId: string,
        roomId: string,
        collectionId: string,
        limit: number = 30,
        beforeCursor?: { createdAt: string; id: string }
    ): Promise<{
        links: any[];
        totalCount: number;
        hasMore: boolean;
        viewedLinkIds: string[];
        commentCounts: Record<string, number>;
    }> {
        try {
            // Verify room access
            const room = await this.repository.findByIdAndMember(roomId, userId);
            if (!room) {
                throw new ServiceError('Room not found or access denied', 404);
            }

            // Verify collection belongs to room
            const collection = await this.collectionRepo.findById(collectionId);
            if (!collection || collection.roomId.toString() !== roomId) {
                throw new ServiceError('Collection not found', 404);
            }

            // Convert cursor strings to correct types if present
            const cursor = beforeCursor ? {
                createdAt: new Date(beforeCursor.createdAt),
                id: beforeCursor.id
            } : undefined;

            const { links, totalCount } = await this.linkPostRepo.findByCollectionCursor(
                collectionId,
                limit,
                cursor
            );

            // Get viewed links and comment counts for these links
            const linkIds = links.map((l: ILinkPost) => l._id.toString());
            const [viewedLinkIds, commentCounts] = await Promise.all([
                this.linkViewRepo.findViewedLinkIds(userId, linkIds),
                this.linkCommentRepo.countByLinkIds(linkIds)
            ]);

            return {
                links,
                totalCount,
                hasMore: links.length === limit, // With cursors, we check if we hit the limit
                viewedLinkIds,
                commentCounts
            };
        } catch (error) {
            if (error instanceof ServiceError) throw error;
            logger.error('Get collection links error:', error);
            throw new ServiceError('Failed to get collection links', 500);
        }
    }

    // ============== Link Operations ==============

    async postLink(
        userId: string,
        roomId: string,
        data: PostLinkDTO,
        req: Request
    ): Promise<ILinkPost> {
        try {
            if (!data.url) {
                throw new ServiceError('URL is required', 400);
            }

            const room = await this.repository.findByIdAndMember(roomId, userId);
            if (!room) {
                throw new ServiceError('Room not found or access denied', 404);
            }

            // Find target collection
            let targetCollectionId = data.collectionId;
            if (!targetCollectionId) {
                const defaultCollection = await this.collectionRepo.findDefaultLinksCollection(roomId);
                if (defaultCollection) {
                    targetCollectionId = defaultCollection._id.toString();
                } else {
                    throw new ServiceError('No collection found for links', 400);
                }
            }

            // Verify collection belongs to room
            const collection = await this.collectionRepo.findByIdAndRoom(targetCollectionId, roomId);
            if (!collection) {
                throw new ServiceError('Collection not found', 404);
            }

            // Clean up URL
            let targetUrl = data.url;
            if (!/^https?:\/\//i.test(targetUrl)) {
                targetUrl = 'https://' + targetUrl;
            }

            // Check duplicate
            const existingLink = await this.linkPostRepo.findByCollectionAndUrl(targetCollectionId, targetUrl);
            if (existingLink) {
                throw new ServiceError('Link already exists in this collection', 400);
            }

            // Create link instantly with placeholder preview
            const placeholderPreview: IPreviewData = {
                title: targetUrl.split('://')[1] || targetUrl,
                scrapeStatus: 'scraping'
            };

            const linkPost = await this.linkPostRepo.create({
                collectionId: targetCollectionId as any,
                userId: userId as any,
                url: targetUrl,
                previewData: placeholderPreview
            } as any);

            logger.info(`Link posted instantly to room ${roomId} by user ${userId}`);

            // Populate user for the broadcast so the name doesn't show as 'Unknown'
            await linkPost.populate('userId', 'username');

            // Broadcast to room immediately
            SocketManager.broadcastToRoom(roomId, 'NEW_LINK', {
                link: linkPost,
                collectionId: targetCollectionId
            });

            // Start background scraping (do not await)
            this.backgroundScrapeAndBroadcast(linkPost._id.toString(), targetUrl, roomId);

            await this.logAction(userId, 'LINK_POST', 'SUCCESS', req, {
                roomId,
                linkPostId: linkPost._id.toString()
            });

            return linkPost;
        } catch (error) {
            if (error instanceof ServiceError) throw error;
            logger.error('Post link error:', error);
            throw new ServiceError('Failed to post link', 500);
        }
    }

    async deleteLink(userId: string, linkId: string, req: Request): Promise<void> {
        try {
            const linkPost = await this.linkPostRepo.findById(linkId);
            if (!linkPost) {
                throw new ServiceError('Link not found', 404);
            }

            const collection = await this.collectionRepo.findById(linkPost.collectionId.toString());
            if (!collection) {
                throw new ServiceError('Collection not found', 404);
            }

            const room = await this.repository.findById(collection.roomId.toString());
            if (!room) {
                throw new ServiceError('Room not found', 404);
            }

            const isPostCreator = linkPost.userId.toString() === userId;
            const isRoomOwner = room.members.some(
                m => m.userId.toString() === userId && m.role === 'owner'
            );

            if (!isPostCreator && !isRoomOwner) {
                throw new ServiceError('You can only delete your own posts', 403);
            }

            await this.linkPostRepo.deleteById(linkId);

            // Also delete all comments for this link
            await this.linkCommentRepo.deleteByLinkId(linkId);

            // Broadcast deletion to room
            SocketManager.broadcastToRoom(room._id.toString(), 'LINK_DELETED', {
                linkId,
                collectionId: collection._id.toString()
            });

            await this.logAction(userId, 'FILE_DELETE', 'SUCCESS', req, {
                action: 'delete_link_post',
                linkId,
                roomId: room._id.toString()
            });
        } catch (error) {
            if (error instanceof ServiceError) throw error;
            logger.error('Delete link error:', error);
            throw new ServiceError('Failed to delete link', 500);
        }
    }

    async markLinkViewed(userId: string, linkId: string): Promise<void> {
        try {
            const linkPost = await this.linkPostRepo.findById(linkId);
            if (!linkPost) {
                throw new ServiceError('Link not found', 404);
            }

            // Verify room membership
            const collection = await this.collectionRepo.findById(linkPost.collectionId.toString());
            if (!collection) {
                throw new ServiceError('Collection not found', 404);
            }

            const room = await this.repository.findByIdAndMember(collection.roomId.toString(), userId);
            if (!room) {
                throw new ServiceError('Not a member of this room', 403);
            }

            // Fire-and-forget: don't await the secondary DB write
            this.linkViewRepo.markViewedAsync(
                userId,
                linkId,
                collection._id.toString(),
                collection.roomId.toString()
            );
        } catch (error) {
            if (error instanceof ServiceError) throw error;
            logger.error('Mark link viewed error:', error);
            throw new ServiceError('Failed to mark link as viewed', 500);
        }
    }

    async unmarkLinkViewed(userId: string, linkId: string): Promise<void> {
        try {
            const linkPost = await this.linkPostRepo.findById(linkId);
            if (!linkPost) {
                throw new ServiceError('Link not found', 404);
            }

            // Fire-and-forget: don't await the secondary DB write
            this.linkViewRepo.unmarkViewedAsync(userId, linkId);
        } catch (error) {
            if (error instanceof ServiceError) throw error;
            logger.error('Unmark link viewed error:', error);
            throw new ServiceError('Failed to unmark link', 500);
        }
    }

    async moveLink(userId: string, linkId: string, collectionId: string): Promise<ILinkPost> {
        try {
            if (!collectionId) {
                throw new ServiceError('Target collection ID is required', 400);
            }

            const linkPost = await this.linkPostRepo.findById(linkId);
            if (!linkPost) {
                throw new ServiceError('Link not found', 404);
            }

            const targetCollection = await this.collectionRepo.findById(collectionId);
            if (!targetCollection) {
                throw new ServiceError('Target collection not found', 404);
            }

            const room = await this.repository.findByIdAndMember(
                targetCollection.roomId.toString(),
                userId
            );
            if (!room) {
                throw new ServiceError('Not a member of this room', 403);
            }

            const updated = await this.linkPostRepo.updateCollection(linkId, collectionId);
            if (!updated) {
                throw new ServiceError('Failed to move link', 500);
            }

            // Populate user for the broadcast
            await updated.populate('userId', 'username');

            // Broadcast movement to room
            SocketManager.broadcastToRoom(targetCollection.roomId.toString(), 'LINK_MOVED', {
                linkId,
                newCollectionId: collectionId,
                link: updated
            });

            return updated;
        } catch (error) {
            if (error instanceof ServiceError) throw error;
            logger.error('Move link error:', error);
            throw new ServiceError('Failed to move link', 500);
        }
    }

    // ============== Collection Operations ==============

    async createCollection(
        userId: string,
        roomId: string,
        data: CreateCollectionDTO
    ): Promise<ICollection> {
        try {
            if (!data.name) {
                throw new ServiceError('Collection name is required', 400);
            }

            const room = await this.repository.findByIdAndMember(roomId, userId);
            if (!room) {
                throw new ServiceError('Room not found or not a member', 403);
            }

            const collection = await this.collectionRepo.create({
                roomId: roomId as any,
                name: data.name,
                type: data.type || 'links'
            } as any);

            return collection;
        } catch (error) {
            if (error instanceof ServiceError) throw error;
            logger.error('Create collection error:', error);
            throw new ServiceError('Failed to create collection', 500);
        }
    }

    async deleteCollection(userId: string, collectionId: string, req: Request): Promise<void> {
        try {
            const collection = await this.collectionRepo.findById(collectionId);
            if (!collection) {
                throw new ServiceError('Collection not found', 404);
            }

            const room = await this.repository.findById(collection.roomId.toString());
            if (!room) {
                throw new ServiceError('Room not found', 404);
            }

            const member = room.members.find(m => m.userId.toString() === userId);
            if (!member || (member.role !== 'owner' && member.role !== 'admin')) {
                throw new ServiceError('Only room owner or admin can delete collections', 403);
            }

            // Delete all links in collection
            await this.linkPostRepo.deleteByCollection(collectionId);

            // Delete collection
            await this.collectionRepo.deleteById(collectionId);

            await this.logAction(userId, 'COLLECTION_DELETE', 'SUCCESS', req, {
                collectionId,
                roomId: room._id.toString()
            });

            logger.info(`Collection ${collectionId} deleted by user ${userId}`);
        } catch (error) {
            if (error instanceof ServiceError) throw error;
            logger.error('Delete collection error:', error);
            throw new ServiceError('Failed to delete collection', 500);
        }
    }

    // ============== Comment Operations ==============

    async getComments(userId: string, linkId: string): Promise<any[]> {
        try {
            const linkPost = await this.linkPostRepo.findById(linkId);
            if (!linkPost) {
                throw new ServiceError('Link not found', 404);
            }

            const collection = await this.collectionRepo.findById(linkPost.collectionId.toString());
            if (!collection) {
                throw new ServiceError('Collection not found', 404);
            }

            const room = await this.repository.findByIdAndMember(collection.roomId.toString(), userId);
            if (!room) {
                throw new ServiceError('Not a member of this room', 403);
            }

            const comments = await this.linkCommentRepo.findByLinkId(linkId);

            return comments;
        } catch (error) {
            if (error instanceof ServiceError) throw error;
            logger.error('Get comments error:', error);
            throw new ServiceError('Failed to get comments', 500);
        }
    }

    async postComment(userId: string, linkId: string, encryptedContent: string): Promise<any> {
        try {
            if (!encryptedContent) {
                throw new ServiceError('Encrypted content is required', 400);
            }

            const linkPost = await this.linkPostRepo.findById(linkId);
            if (!linkPost) {
                throw new ServiceError('Link not found', 404);
            }

            const collection = await this.collectionRepo.findById(linkPost.collectionId.toString());
            if (!collection) {
                throw new ServiceError('Collection not found', 404);
            }

            const room = await this.repository.findByIdAndMember(collection.roomId.toString(), userId);
            if (!room) {
                throw new ServiceError('Not a member of this room', 403);
            }

            const comment = await this.linkCommentRepo.createComment(linkId, userId, encryptedContent);

            logger.info(`Comment posted on link ${linkId} by user ${userId}`);
            // Broadcast to room (need roomId from collection)
            const link = await this.linkPostRepo.findById(linkId);
            if (link) {
                const collection = await this.collectionRepo.findById(link.collectionId.toString());
                if (collection) {
                    const countMap = await this.linkCommentRepo.countByLinkIds([linkId]);
                    SocketManager.broadcastToRoom(collection.roomId.toString(), 'NEW_COMMENT', {
                        linkId,
                        commentCount: countMap[linkId] || 0
                    });
                }
            }

            return comment;
        } catch (error) {
            if (error instanceof ServiceError) throw error;
            logger.error('Post comment error:', error);
            throw new ServiceError('Failed to post comment', 500);
        }
    }

    async deleteComment(userId: string, commentId: string): Promise<void> {
        try {
            const comment = await this.linkCommentRepo.findById(commentId);
            if (!comment) {
                throw new ServiceError('Comment not found', 404);
            }

            const linkPost = await this.linkPostRepo.findById(comment.linkId.toString());
            if (!linkPost) {
                throw new ServiceError('Link not found', 404);
            }

            const collection = await this.collectionRepo.findById(linkPost.collectionId.toString());
            if (!collection) {
                throw new ServiceError('Collection not found', 404);
            }

            const room = await this.repository.findById(collection.roomId.toString());
            if (!room) {
                throw new ServiceError('Room not found', 404);
            }

            const isCommentAuthor = comment.userId.toString() === userId;
            const isRoomOwner = room.members.some(
                m => m.userId.toString() === userId && m.role === 'owner'
            );

            if (!isCommentAuthor && !isRoomOwner) {
                throw new ServiceError('Permission denied', 403);
            }

            await this.linkCommentRepo.deleteById(commentId);

            // Re-calculate count and broadcast
            const countMap = await this.linkCommentRepo.countByLinkIds([comment.linkId.toString()]);
            const newCount = countMap[comment.linkId.toString()] || 0;

            SocketManager.broadcastToRoom(room._id.toString(), 'NEW_COMMENT', {
                linkId: comment.linkId.toString(),
                commentCount: newCount
            });

            logger.info(`Comment ${commentId} deleted by user ${userId}`);
        } catch (error) {
            if (error instanceof ServiceError) throw error;
            logger.error('Delete comment error:', error);
            throw new ServiceError('Failed to delete comment', 500);
        }
    }

    // ============== Helper Methods ==============

    private async fetchLinkPreview(targetUrl: string): Promise<IPreviewData> {
        let previewData: IPreviewData = {
            title: '',
            description: '',
            image: '',
            favicon: '',
            scrapeStatus: 'success'
        };

        try {
            // Check cache (unless it was a failure)
            const cachedMetadata = await this.linkMetadataRepo.findValidByUrl(targetUrl);
            if (cachedMetadata) {
                return {
                    title: cachedMetadata.title,
                    description: cachedMetadata.description,
                    image: cachedMetadata.image,
                    favicon: cachedMetadata.favicon,
                    scrapeStatus: cachedMetadata.scrapeStatus || 'success'
                };
            }

            // Fetch fresh
            const scrapeResult = await smartScrape(targetUrl);
            previewData = {
                ...scrapeResult,
                title: scrapeResult.title || '',
                description: scrapeResult.description || '',
                image: scrapeResult.image || '',
                favicon: scrapeResult.favicon || '',
                scrapeStatus: scrapeResult.scrapeStatus
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
                    } catch { return u; }
                }
                return u;
            };

            previewData.image = normalize(previewData.image || '');
            previewData.favicon = normalize(previewData.favicon || '');

            // Cache (fire-and-forget: don't await)
            this.linkMetadataRepo.upsertMetadataAsync(targetUrl, previewData);
        } catch (error) {
            logger.error(`Error fetching link preview for ${targetUrl}:`, error);
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

    private async backgroundScrapeAndBroadcast(linkId: string, url: string, roomId: string): Promise<void> {
        try {
            const previewData = await this.fetchLinkPreview(url);
            const updatedLink = await this.linkPostRepo.updateById(linkId, { $set: { previewData } } as any);

            if (updatedLink) {
                // Populate user for the broadcast
                await updatedLink.populate('userId', 'username');

                SocketManager.broadcastToRoom(roomId, 'LINK_UPDATED', {
                    link: updatedLink
                });
                logger.debug(`Background scrape complete for link ${linkId}`);
            }
        } catch (error) {
            logger.error(`Background scraper failed for link ${linkId}:`, error);

            // Critical: Update status to 'failed' in DB so UI stops spinning
            try {
                const updatedLink = await this.linkPostRepo.updateById(linkId, {
                    $set: { 'previewData.scrapeStatus': 'failed' }
                } as any);

                if (updatedLink) {
                    await updatedLink.populate('userId', 'username');
                    SocketManager.broadcastToRoom(roomId, 'LINK_UPDATED', {
                        link: updatedLink
                    });
                }
            } catch (innerError) {
                logger.error(`Final fail-safe for link ${linkId} failed:`, innerError);
            }
        }
    }
}
