import { Request } from 'express';
import { BaseService, ServiceError } from '../base/BaseService';
import { LinkPostRepository } from '../../repositories/LinkPostRepository';
import { RoomRepository } from '../../repositories/RoomRepository';
import { CollectionRepository } from '../../repositories/CollectionRepository';
import { LinkViewRepository } from '../../repositories/LinkViewRepository';
import { LinkCommentRepository } from '../../repositories/LinkCommentRepository';
import { LinkMetadataRepository } from '../../repositories/LinkMetadataRepository';
import { ILinkPost, IPreviewData } from '../../models/LinkPost';
import { verifyLinkAccess } from './accessHelpers';
import logger from '../../utils/logger';
import SocketManager from '../../utils/SocketManager';
import { smartScrape } from '../../utils/scraper';
import { URL } from 'url';

export interface PostLinkDTO {
    url: string;
    collectionId?: string;
}

export class LinkService extends BaseService<ILinkPost, LinkPostRepository> {
    private roomRepo: RoomRepository;
    private collectionRepo: CollectionRepository;
    private linkViewRepo: LinkViewRepository;
    private linkCommentRepo: LinkCommentRepository;
    private linkMetadataRepo: LinkMetadataRepository;

    constructor() {
        super(new LinkPostRepository());
        this.roomRepo = new RoomRepository();
        this.collectionRepo = new CollectionRepository();
        this.linkViewRepo = new LinkViewRepository();
        this.linkCommentRepo = new LinkCommentRepository();
        this.linkMetadataRepo = new LinkMetadataRepository();
    }

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
            const room = await this.roomRepo.findByIdAndMember(roomId, userId);
            if (!room) {
                throw new ServiceError('Room not found or access denied', 404);
            }

            const collection = await this.collectionRepo.findById(collectionId);
            if (!collection || collection.roomId.toString() !== roomId) {
                throw new ServiceError('Collection not found', 404);
            }

            const cursor = beforeCursor ? {
                createdAt: new Date(beforeCursor.createdAt),
                id: beforeCursor.id
            } : undefined;

            const { links, totalCount } = await this.repository.findByCollectionCursor(
                collectionId,
                limit,
                cursor
            );

            const linkIds = links.map((l: ILinkPost) => l._id.toString());
            const [viewedLinkIds, commentCounts] = await Promise.all([
                this.linkViewRepo.findViewedLinkIds(userId, linkIds),
                this.linkCommentRepo.countByLinkIds(linkIds)
            ]);

            return {
                links,
                totalCount,
                hasMore: links.length === limit,
                viewedLinkIds,
                commentCounts
            };
        } catch (error) {
            if (error instanceof ServiceError) throw error;
            logger.error('Get collection links error:', error);
            throw new ServiceError('Failed to get collection links', 500);
        }
    }

    async searchRoomLinks(
        userId: string,
        roomId: string,
        searchQuery: string,
        limit: number = 50
    ): Promise<{
        links: any[];
        viewedLinkIds: string[];
        commentCounts: Record<string, number>;
    }> {
        try {
            const room = await this.roomRepo.findByIdAndMember(roomId, userId);
            if (!room) {
                throw new ServiceError('Room not found or access denied', 404);
            }

            const collections = await this.collectionRepo.findByRoom(roomId);
            const collectionIds = collections.map(c => c._id.toString());

            if (collectionIds.length === 0) {
                return { links: [], viewedLinkIds: [], commentCounts: {} };
            }

            const links = await this.repository.searchLinks(collectionIds, searchQuery, limit);

            const linkIds = links.map((l: ILinkPost) => l._id.toString());
            const [viewedLinkIds, commentCounts] = await Promise.all([
                this.linkViewRepo.findViewedLinkIds(userId, linkIds),
                this.linkCommentRepo.countByLinkIds(linkIds)
            ]);

            return {
                links,
                viewedLinkIds,
                commentCounts
            };
        } catch (error) {
            if (error instanceof ServiceError) throw error;
            logger.error('Search room links error:', error);
            throw new ServiceError('Failed to search room links', 500);
        }
    }

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

            const room = await this.roomRepo.findByIdAndMember(roomId, userId);
            if (!room) {
                throw new ServiceError('Room not found or access denied', 404);
            }

            let targetCollectionId = data.collectionId;
            if (!targetCollectionId) {
                const defaultCollection = await this.collectionRepo.findDefaultLinksCollection(roomId);
                if (defaultCollection) {
                    targetCollectionId = defaultCollection._id.toString();
                } else {
                    throw new ServiceError('No collection found for links', 400);
                }
            }

            const collection = await this.collectionRepo.findByIdAndRoom(targetCollectionId, roomId);
            if (!collection) {
                throw new ServiceError('Collection not found', 404);
            }

            let targetUrl = data.url;
            if (!/^https?:\/\//i.test(targetUrl)) {
                targetUrl = 'https://' + targetUrl;
            }

            const existingLink = await this.repository.findByCollectionAndUrl(targetCollectionId, targetUrl);
            if (existingLink) {
                throw new ServiceError('Link already exists in this collection', 400);
            }

            const placeholderPreview: IPreviewData = {
                title: targetUrl.split('://')[1] || targetUrl,
                scrapeStatus: 'scraping'
            };

            const linkPost = await this.repository.create({
                collectionId: targetCollectionId as any,
                userId: userId as any,
                url: targetUrl,
                previewData: placeholderPreview
            } as any);

            await linkPost.populate('userId', 'username');

            SocketManager.broadcastToRoom(roomId, 'NEW_LINK', {
                link: linkPost,
                collectionId: targetCollectionId
            });

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
            const { link, roomId, room } = await verifyLinkAccess(linkId, userId);

            const isPostCreator = link.userId.toString() === userId;
            const isRoomOwner = room.members.some(
                (m: any) => m.userId.toString() === userId && m.role === 'owner'
            );

            if (!isPostCreator && !isRoomOwner) {
                throw new ServiceError('You can only delete your own posts', 403);
            }

            await this.repository.deleteById(linkId);
            await this.linkCommentRepo.deleteByLinkId(linkId);

            SocketManager.broadcastToRoom(roomId, 'LINK_DELETED', {
                linkId,
                collectionId: link.collectionId.toString()
            });

            await this.logAction(userId, 'LINK_DELETE', 'SUCCESS', req, {
                linkId,
                roomId
            });
        } catch (error) {
            if (error instanceof ServiceError) throw error;
            logger.error('Delete link error:', error);
            throw new ServiceError('Failed to delete link', 500);
        }
    }

    async markLinkViewed(userId: string, linkId: string): Promise<void> {
        try {
            const { link, roomId } = await verifyLinkAccess(linkId, userId);

            this.linkViewRepo.markViewedAsync(
                userId,
                linkId,
                link.collectionId.toString(),
                roomId
            );
        } catch (error) {
            if (error instanceof ServiceError) throw error;
            logger.error('Mark link viewed error:', error);
            throw new ServiceError('Failed to mark link as viewed', 500);
        }
    }

    async unmarkLinkViewed(userId: string, linkId: string): Promise<void> {
        try {
            // Unmarking doesn't strictly need optimized room access check, 
            // but we use it for consistency and to verify link exists.
            await verifyLinkAccess(linkId, userId);

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

            const { link, roomId: oldRoomId } = await verifyLinkAccess(linkId, userId);

            const targetCollection = await this.collectionRepo.findById(collectionId);
            if (!targetCollection) {
                throw new ServiceError('Target collection not found', 404);
            }

            if (targetCollection.roomId.toString() !== oldRoomId) {
                throw new ServiceError('Cannot move link to a different room', 400);
            }

            const updated = await this.repository.updateCollection(linkId, collectionId);
            if (!updated) {
                throw new ServiceError('Failed to move link', 500);
            }

            await updated.populate('userId', 'username');

            SocketManager.broadcastToRoom(oldRoomId, 'LINK_MOVED', {
                linkId,
                oldCollectionId: link.collectionId.toString(),
                newCollectionId: collectionId,
                link: updated
            });

            await this.logAction(userId, 'LINK_MOVE', 'SUCCESS', {} as any, {
                linkId,
                oldCollectionId: link.collectionId.toString(),
                newCollectionId: collectionId,
                roomId: oldRoomId
            });

            return updated;
        } catch (error) {
            if (error instanceof ServiceError) throw error;
            logger.error('Move link error:', error);
            throw new ServiceError('Failed to move link', 500);
        }
    }

    private async fetchLinkPreview(targetUrl: string): Promise<IPreviewData> {
        let previewData: IPreviewData = {
            title: '',
            description: '',
            image: '',
            favicon: '',
            scrapeStatus: 'success'
        };

        try {
            // Check cache
            const cachedMetadata = await this.linkMetadataRepo.findValidByUrl(targetUrl);
            if (cachedMetadata) {
                return {
                    title: cachedMetadata.title,
                    description: cachedMetadata.description,
                    image: cachedMetadata.image,
                    favicon: cachedMetadata.favicon,
                    scrapeStatus: (cachedMetadata.scrapeStatus as any) || 'success'
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

            // Cache (fire-and-forget)
            this.linkMetadataRepo.upsertMetadataAsync(targetUrl, previewData as any);
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

    async backgroundScrapeAndBroadcast(linkId: string, url: string, roomId: string): Promise<void> {
        try {
            const previewData = await this.fetchLinkPreview(url);

            const updated = await this.repository.updateById(linkId, {
                $set: { previewData }
            } as any);

            if (updated) {
                await updated.populate('userId', 'username');
                SocketManager.broadcastToRoom(roomId, 'LINK_UPDATED', {
                    link: updated
                });
            }
        } catch (error) {
            logger.error(`Background scraping failed for link ${linkId}:`, error);
            try {
                const updated = await this.repository.updateById(linkId, {
                    $set: { 'previewData.scrapeStatus': 'failed' }
                } as any);
                if (updated) {
                    await updated.populate('userId', 'username');
                    SocketManager.broadcastToRoom(roomId, 'LINK_UPDATED', {
                        link: updated
                    });
                }
            } catch (innerError) {
                logger.error(`Final fail-safe for link ${linkId} failed:`, innerError);
            }
        }
    }
}
