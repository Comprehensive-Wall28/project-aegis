import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { LinkCommentRepository } from './repositories/link-comment.repository';
import { SocialRepository } from './social.repository';
import { LinkAccessHelper } from './utils/link-access.helper';
import { AuditService } from '../../common/services/audit.service';
import { WebsocketGateway } from '../websocket/websocket.gateway';
import { LinkComment } from './schemas/link-comment.schema';
import { CreateCommentDto } from './dto/comment.dto';
import { FastifyRequest } from 'fastify';

@Injectable()
export class CommentService {
  private readonly logger = new Logger(CommentService.name);

  constructor(
    private readonly linkCommentRepository: LinkCommentRepository,
    private readonly socialRepository: SocialRepository,
    private readonly linkAccessHelper: LinkAccessHelper,
    private readonly websocketGateway: WebsocketGateway,
    private readonly auditService: AuditService,
  ) {}

  async getComments(
    userId: string,
    linkId: string,
    limit: number = 20,
    cursorCreatedAt?: string,
    cursorId?: string,
  ): Promise<{
    comments: LinkComment[];
    totalCount: number;
    hasMore: boolean;
  }> {
    // Verify access to the link
    await this.linkAccessHelper.verifyLinkAccess(linkId, userId);

    const beforeCursor =
      cursorCreatedAt && cursorId
        ? {
            createdAt: new Date(cursorCreatedAt),
            id: cursorId,
          }
        : undefined;

    const { comments, totalCount } =
      await this.linkCommentRepository.findByLinkIdWithPagination(
        linkId,
        limit,
        beforeCursor,
      );

    return {
      comments,
      totalCount,
      hasMore: comments.length === limit,
    };
  }

  async postComment(
    userId: string,
    linkId: string,
    data: CreateCommentDto,
    req?: FastifyRequest | any,
  ): Promise<LinkComment> {
    if (!data.content) {
      throw new BadRequestException('Comment content is required');
    }

    const { roomId } = await this.linkAccessHelper.verifyLinkAccess(
      linkId,
      userId,
    );

    const comment = await this.linkCommentRepository.create(
      linkId,
      userId,
      data.content,
    );

    // Broadcast to room
    this.websocketGateway.broadcastToRoom(roomId, 'NEW_COMMENT', {
      linkId,
      comment,
    });

    await this.auditService.logAuditEvent(
      userId,
      'LINK_COMMENT_ADD',
      'SUCCESS',
      req,
      {
        linkId,
        roomId,
        commentId: comment._id.toString(),
      },
    );

    return comment;
  }

  async deleteComment(
    userId: string,
    commentId: string,
    req?: FastifyRequest | any,
  ): Promise<void> {
    const comment = await this.linkCommentRepository.findById(commentId);
    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    const { roomId, room } = await this.linkAccessHelper.verifyLinkAccess(
      comment.linkId.toString(),
      userId,
    );

    const isCommentAuthor = comment.userId.toString() === userId;
    const isRoomOwner = room.members.some(
      (m: any) => m.userId.toString() === userId && m.role === 'owner',
    );

    if (!isCommentAuthor && !isRoomOwner) {
      throw new ForbiddenException('Permission denied');
    }

    await this.linkCommentRepository.deleteById(commentId);

    // Broadcast to room
    this.websocketGateway.broadcastToRoom(roomId, 'COMMENT_DELETED', {
      linkId: comment.linkId.toString(),
      commentId,
    });

    await this.auditService.logAuditEvent(
      userId,
      'LINK_COMMENT_DELETE',
      'SUCCESS',
      req,
      {
        commentId,
        linkId: comment.linkId.toString(),
        roomId,
      },
    );
  }
}
