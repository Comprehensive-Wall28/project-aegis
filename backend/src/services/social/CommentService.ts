import { Request } from 'express';
import { BaseService, ServiceError } from '../base/BaseService';
import { LinkCommentRepository } from '../../repositories/LinkCommentRepository';
import { verifyLinkAccess } from './accessHelpers';
import logger from '../../utils/logger';
import SocketManager from '../../utils/SocketManager';

export class CommentService extends BaseService<any, LinkCommentRepository> {
    constructor() {
        super(new LinkCommentRepository());
    }

    async getComments(
        userId: string,
        linkId: string,
        limit: number = 20,
        beforeCursor?: { createdAt: string; id: string }
    ) {
        try {
            await verifyLinkAccess(linkId, userId);

            const cursor = beforeCursor ? {
                createdAt: new Date(beforeCursor.createdAt),
                id: beforeCursor.id
            } : undefined;

            const { comments, totalCount } = await this.repository.findByLinkIdWithPagination(
                linkId,
                limit,
                cursor
            );

            return {
                comments,
                totalCount,
                hasMore: comments.length === limit
            };
        } catch (error) {
            if (error instanceof ServiceError) throw error;
            logger.error('Get comments error:', error);
            throw new ServiceError('Failed to get comments', 500);
        }
    }

    async postComment(
        userId: string,
        linkId: string,
        content: string,
        req: Request
    ) {
        try {
            if (!content) {
                throw new ServiceError('Comment content is required', 400);
            }

            const { roomId } = await verifyLinkAccess(linkId, userId);

            const comment = await this.repository.createComment(linkId, userId, content);

            // Broadcast to room
            SocketManager.broadcastToRoom(roomId, 'NEW_COMMENT', {
                linkId,
                comment
            });

            // Using FILE_CREATE as a fallback if specific ones don't exist, but typically these are custom
            await this.logAction(userId, 'LINK_COMMENT_ADD', 'SUCCESS', req, {
                linkId,
                roomId,
                commentId: comment._id.toString()
            });

            return comment;
        } catch (error) {
            if (error instanceof ServiceError) throw error;
            logger.error('Post comment error:', error);
            throw new ServiceError('Failed to post comment', 500);
        }
    }

    async deleteComment(
        userId: string,
        commentId: string,
        req: Request
    ) {
        try {
            const comment = await this.repository.findById(commentId);
            if (!comment) {
                throw new ServiceError('Comment not found', 404);
            }

            const { roomId, room } = await verifyLinkAccess(comment.linkId.toString(), userId);

            const isCommentAuthor = comment.userId.toString() === userId;
            const isRoomOwner = room.members.some(
                (m: any) => m.userId.toString() === userId && m.role === 'owner'
            );

            if (!isCommentAuthor && !isRoomOwner) {
                throw new ServiceError('Permission denied', 403);
            }

            await this.repository.deleteById(commentId);

            // Broadcast to room
            SocketManager.broadcastToRoom(roomId, 'COMMENT_DELETED', {
                linkId: comment.linkId.toString(),
                commentId
            });

            await this.logAction(userId, 'LINK_COMMENT_DELETE', 'SUCCESS', req, {
                commentId,
                linkId: comment.linkId.toString(),
                roomId
            });
        } catch (error) {
            if (error instanceof ServiceError) throw error;
            logger.error('Delete comment error:', error);
            throw new ServiceError('Failed to delete comment', 500);
        }
    }
}
