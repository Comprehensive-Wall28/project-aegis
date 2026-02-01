// import { Request } from 'express'; // Removed for Fastify migration
import { BaseService, ServiceError } from '../base/BaseService';
import { ReaderAnnotationRepository } from '../../repositories/ReaderAnnotationRepository';
import { ReaderContentCacheRepository } from '../../repositories/ReaderContentCacheRepository';
import { LinkPostRepository } from '../../repositories/LinkPostRepository';
import { verifyLinkAccess } from './accessHelpers';
import { readerScrape, ReaderContentResult } from '../../utils/scraper';
import logger from '../../utils/logger';
import SocketManager from '../../utils/SocketManager';
import { IReaderAnnotation } from '../../models/ReaderAnnotation';

export class ReaderService extends BaseService<any, ReaderAnnotationRepository> {
    private readerContentCacheRepo: ReaderContentCacheRepository;
    private linkPostRepo: LinkPostRepository;

    constructor() {
        super(new ReaderAnnotationRepository());
        this.readerContentCacheRepo = new ReaderContentCacheRepository();
        this.linkPostRepo = new LinkPostRepository();
    }

    async getReaderContent(userId: string, linkId: string): Promise<ReaderContentResult & { annotationCounts: Record<string, number> }> {
        try {
            const { link } = await verifyLinkAccess(linkId, userId);

            // Check cache first
            const cached = await this.readerContentCacheRepo.findValidByUrl(link.url);
            let readerResult: ReaderContentResult;

            if (cached) {
                logger.debug(`[Social:Reader] Cache HIT for link ${linkId} (${link.url})`);
                readerResult = {
                    title: cached.title,
                    byline: cached.byline,
                    content: cached.content,
                    textContent: cached.textContent,
                    siteName: cached.siteName,
                    status: cached.status as any,
                    error: cached.error
                };
            } else {
                logger.info(`[Social:Reader] Cache MISS - Fetching fresh for link ${linkId} (${link.url})`);
                readerResult = await readerScrape(link.url);

                // Cache in background
                this.readerContentCacheRepo.upsertContent(link.url, readerResult);
            }

            const annotationCounts = await this.repository.countByParagraphForLink(linkId);

            return {
                ...readerResult,
                annotationCounts
            };
        } catch (error) {
            if (error instanceof ServiceError) throw error;
            logger.error('Get reader content error:', error);
            throw new ServiceError('Failed to get reader content', 500);
        }
    }

    async getAnnotations(userId: string, linkId: string): Promise<IReaderAnnotation[]> {
        try {
            await verifyLinkAccess(linkId, userId);
            return this.repository.findByLinkId(linkId);
        } catch (error) {
            if (error instanceof ServiceError) throw error;
            logger.error('Get annotations error:', error);
            throw new ServiceError('Failed to get annotations', 500);
        }
    }

    async createAnnotation(
        userId: string,
        linkId: string,
        paragraphId: string,
        highlightText: string,
        encryptedContent: string,
        req: any
    ): Promise<IReaderAnnotation> {
        try {
            if (!paragraphId || !highlightText || !encryptedContent) {
                throw new ServiceError('Missing required fields', 400);
            }

            const { roomId } = await verifyLinkAccess(linkId, userId);

            const annotation = await this.repository.createAnnotation({
                linkId,
                roomId,
                userId,
                paragraphId,
                highlightText: highlightText.slice(0, 500),
                encryptedContent
            });

            SocketManager.broadcastToRoom(roomId, 'NEW_ANNOTATION', {
                linkId,
                annotation
            });

            await this.logAction(userId, 'LINK_COMMENT_ADD', 'SUCCESS', req, {
                linkId,
                roomId,
                annotationId: annotation._id.toString(),
                isAnnotation: true
            });

            return annotation;
        } catch (error) {
            if (error instanceof ServiceError) throw error;
            logger.error('Create annotation error:', error);
            throw new ServiceError('Failed to create annotation', 500);
        }
    }

    async deleteAnnotation(userId: string, annotationId: string, req: any): Promise<void> {
        try {
            const annotation = await this.repository.findById(annotationId);
            if (!annotation) {
                throw new ServiceError('Annotation not found', 404);
            }

            const { roomId, room } = await verifyLinkAccess(annotation.linkId.toString(), userId);

            const isAnnotationAuthor = annotation.userId.toString() === userId;
            const isRoomOwner = room.members.some(
                (m: any) => m.userId.toString() === userId && m.role === 'owner'
            );

            if (!isAnnotationAuthor && !isRoomOwner) {
                throw new ServiceError('Permission denied', 403);
            }

            await this.repository.deleteById(annotationId);

            SocketManager.broadcastToRoom(roomId, 'ANNOTATION_DELETED', {
                linkId: annotation.linkId.toString(),
                annotationId
            });

            await this.logAction(userId, 'LINK_COMMENT_DELETE', 'SUCCESS', req, {
                annotationId,
                linkId: annotation.linkId.toString(),
                roomId,
                isAnnotation: true
            });
        } catch (error) {
            if (error instanceof ServiceError) throw error;
            logger.error('Delete annotation error:', error);
            throw new ServiceError('Failed to delete annotation', 500);
        }
    }
}
