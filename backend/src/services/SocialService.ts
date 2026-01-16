import { Request } from 'express';
import { randomBytes } from 'crypto';
import { URL } from 'url';
import { BaseService, ServiceError } from './base/BaseService';
import { RoomRepository } from '../repositories/RoomRepository';
import { CollectionRepository } from '../repositories/CollectionRepository';
import { LinkPostRepository } from '../repositories/LinkPostRepository';
import { IRoom, IRoomMember } from '../models/Room';
import { ICollection } from '../models/Collection';
import { ILinkPost, IPreviewData } from '../models/LinkPost';
import { ILinkView, LinkViewSchema } from '../models/LinkView';
import { ILinkMetadata, LinkMetadataSchema } from '../models/LinkMetadata';
import LinkComment from '../models/LinkComment';
import { DatabaseManager } from '../config/DatabaseManager';
import { advancedScrape } from '../utils/scraper';
import logger from '../utils/logger';

/**
 * Get LinkView model from secondary connection
 */
function getLinkViewModel() {
    const dbManager = DatabaseManager.getInstance();
    const connection = dbManager.getConnection('secondary');
    return connection.models['LinkView'] || connection.model<ILinkView>('LinkView', LinkViewSchema);
}

/**
 * Get LinkMetadata model from secondary connection
 */
function getLinkMetadataModel() {
    const dbManager = DatabaseManager.getInstance();
    const connection = dbManager.getConnection('secondary');
    return connection.models['LinkMetadata'] || connection.model<ILinkMetadata>('LinkMetadata', LinkMetadataSchema);
}

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
}

/**
 * SocialService handles all social/room-related business logic
 */
export class SocialService extends BaseService<IRoom, RoomRepository> {
    private collectionRepo: CollectionRepository;
    private linkPostRepo: LinkPostRepository;

    constructor() {
        super(new RoomRepository());
        this.collectionRepo = new CollectionRepository();
        this.linkPostRepo = new LinkPostRepository();
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
        try {
            const room = await this.repository.findByIdAndMember(roomId, userId);
            if (!room) {
                throw new ServiceError('Room not found or access denied', 404);
            }

            const member = room.members.find(m => m.userId.toString() === userId);
            const collections = await this.collectionRepo.findByRoom(roomId);
            const collectionIds = collections.map(c => c._id.toString());
            const links = await this.linkPostRepo.findByCollections(collectionIds);

            // Get viewed links
            const LinkView = getLinkViewModel();
            const viewedLinks = await LinkView.find({
                userId,
                linkId: { $in: links.map(l => l._id) }
            }).select('linkId');
            const viewedLinkIds = viewedLinks.map((v: ILinkView) => v.linkId.toString());

            // Get comment counts
            const commentCounts = await LinkComment.aggregate([
                { $match: { linkId: { $in: links.map(l => l._id) } } },
                { $group: { _id: '$linkId', count: { $sum: 1 } } }
            ]);
            const commentCountMap: Record<string, number> = {};
            commentCounts.forEach((cc: { _id: string; count: number }) => {
                commentCountMap[cc._id.toString()] = cc.count;
            });

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
                links,
                viewedLinkIds,
                commentCounts: commentCountMap
            };
        } catch (error) {
            if (error instanceof ServiceError) throw error;
            logger.error('Get room content error:', error);
            throw new ServiceError('Failed to get room content', 500);
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

            // Fetch metadata
            const previewData = await this.fetchLinkPreview(targetUrl);

            const linkPost = await this.linkPostRepo.create({
                collectionId: targetCollectionId as any,
                userId: userId as any,
                url: targetUrl,
                previewData
            } as any);

            logger.info(`Link posted to room ${roomId} by user ${userId}`);
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

            const LinkView = getLinkViewModel();
            await LinkView.findOneAndUpdate(
                { linkId, userId },
                { viewedAt: new Date() },
                { upsert: true }
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

            const LinkView = getLinkViewModel();
            await LinkView.findOneAndDelete({ linkId, userId });
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

            const comments = await LinkComment.find({ linkId })
                .populate('userId', 'username')
                .sort({ createdAt: 1 });

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

            const comment = await LinkComment.create({
                linkId,
                userId,
                encryptedContent
            });

            await comment.populate('userId', 'username');

            logger.info(`Comment posted on link ${linkId} by user ${userId}`);
            return comment;
        } catch (error) {
            if (error instanceof ServiceError) throw error;
            logger.error('Post comment error:', error);
            throw new ServiceError('Failed to post comment', 500);
        }
    }

    async deleteComment(userId: string, commentId: string): Promise<void> {
        try {
            const comment = await LinkComment.findById(commentId);
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

            await LinkComment.findByIdAndDelete(commentId);
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
            const LinkMetadata = getLinkMetadataModel();
            const cachedMetadata = await LinkMetadata.findOne({ url: targetUrl });
            if (cachedMetadata && cachedMetadata.scrapeStatus !== 'failed') {
                return {
                    title: cachedMetadata.title,
                    description: cachedMetadata.description,
                    image: cachedMetadata.image,
                    favicon: cachedMetadata.favicon,
                    scrapeStatus: cachedMetadata.scrapeStatus || 'success'
                };
            }

            // Fetch fresh
            const scrapeResult = await advancedScrape(targetUrl);
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

            // Cache
            const LinkMetadataForSave = getLinkMetadataModel();
            await LinkMetadataForSave.findOneAndUpdate(
                { url: targetUrl },
                { ...previewData, lastFetched: new Date() },
                { upsert: true, new: true }
            );
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
}
