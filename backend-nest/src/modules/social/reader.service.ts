import { Injectable, NotFoundException, ForbiddenException, BadRequestException, Logger } from '@nestjs/common';
import { ReaderAnnotationRepository } from './repositories/reader-annotation.repository';
import { ReaderContentCacheRepository } from './repositories/reader-content-cache.repository';
import { LinkAccessHelper } from './utils/link-access.helper';
import { ScraperService, ReaderContentResult } from './scraper.service';
import { WebsocketGateway } from '../websocket/websocket.gateway';
import { AuditService } from '../../common/services/audit.service';
import { ReaderAnnotation } from './schemas/reader-annotation.schema';
import { CreateAnnotationDto } from './dto/reader.dto';
import { FastifyRequest } from 'fastify';

@Injectable()
export class ReaderService {
    private readonly logger = new Logger(ReaderService.name);

    constructor(
        private readonly annotationRepository: ReaderAnnotationRepository,
        private readonly cacheRepository: ReaderContentCacheRepository,
        private readonly linkAccessHelper: LinkAccessHelper,
        private readonly scraperService: ScraperService,
        private readonly websocketGateway: WebsocketGateway,
        private readonly auditService: AuditService,
    ) { }

    async getReaderContent(userId: string, linkId: string): Promise<ReaderContentResult & { annotationCounts: Record<string, number> }> {
        const { link } = await this.linkAccessHelper.verifyLinkAccess(linkId, userId);

        // Check cache first
        const cached = await this.cacheRepository.findValidByUrl(link.url);
        let readerResult: ReaderContentResult;

        if (cached) {
            this.logger.debug(`[Social:Reader] Cache HIT for link ${linkId} (${link.url})`);
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
            this.logger.log(`[Social:Reader] Cache MISS - Fetching fresh for link ${linkId} (${link.url})`);
            readerResult = await this.scraperService.readerScrape(link.url);

            // Cache in background
            this.cacheRepository.upsertContent(link.url, readerResult);
        }

        const annotationCounts = await this.annotationRepository.countByParagraphForLink(linkId);

        return {
            ...readerResult,
            annotationCounts
        };
    }

    async getAnnotations(userId: string, linkId: string): Promise<ReaderAnnotation[]> {
        await this.linkAccessHelper.verifyLinkAccess(linkId, userId);
        return this.annotationRepository.findByLinkId(linkId);
    }

    async createAnnotation(
        userId: string,
        linkId: string,
        data: CreateAnnotationDto,
        req?: FastifyRequest | any
    ): Promise<ReaderAnnotation> {
        const { roomId } = await this.linkAccessHelper.verifyLinkAccess(linkId, userId);

        const annotation = await this.annotationRepository.create({
            linkId,
            roomId,
            userId,
            paragraphId: data.paragraphId,
            highlightText: data.highlightText,
            encryptedContent: data.encryptedContent
        });

        // Broadcast to room
        this.websocketGateway.broadcastToRoom(roomId, 'NEW_ANNOTATION', {
            linkId,
            annotation
        });

        await this.auditService.logAuditEvent(userId, 'LINK_COMMENT_ADD', 'SUCCESS', req, {
            linkId,
            roomId,
            annotationId: annotation._id.toString(),
            isAnnotation: true
        });

        return annotation;
    }

    async deleteAnnotation(
        userId: string,
        annotationId: string,
        req?: FastifyRequest | any
    ): Promise<void> {
        const annotation = await this.annotationRepository.findById(annotationId);
        if (!annotation) {
            throw new NotFoundException('Annotation not found');
        }

        const { roomId, room } = await this.linkAccessHelper.verifyLinkAccess(annotation.linkId.toString(), userId);

        const isAnnotationAuthor = annotation.userId.toString() === userId;
        const isRoomOwner = room.members.some(
            (m: any) => m.userId.toString() === userId && m.role === 'owner'
        );

        if (!isAnnotationAuthor && !isRoomOwner) {
            throw new ForbiddenException('Permission denied');
        }

        await this.annotationRepository.deleteById(annotationId);

        // Broadcast to room
        this.websocketGateway.broadcastToRoom(roomId, 'ANNOTATION_DELETED', {
            linkId: annotation.linkId.toString(),
            annotationId
        });

        await this.auditService.logAuditEvent(userId, 'LINK_COMMENT_DELETE', 'SUCCESS', req, {
            annotationId,
            linkId: annotation.linkId.toString(),
            roomId,
            isAnnotation: true
        });
    }
}
