import { BaseRepository } from './base/BaseRepository';
import LinkComment, { ILinkComment } from '../models/LinkComment';
import { SafeFilter } from './base/types';
import mongoose from 'mongoose';

/**
 * LinkCommentRepository handles LinkComment database operations
 * Uses primary DB since comments are core social interaction data
 */
export class LinkCommentRepository extends BaseRepository<ILinkComment> {
    constructor() {
        super(LinkComment);
    }

    /**
     * Find comments by link ID with pagination and user population
     */
    async findByLinkIdWithPagination(
        linkId: string,
        limit: number = 20,
        beforeCursor?: { createdAt: Date; id: string }
    ): Promise<{ comments: ILinkComment[]; totalCount: number }> {
        const query: any = { linkId: { $eq: linkId as any } };

        if (beforeCursor) {
            query.$or = [
                { createdAt: { $lt: beforeCursor.createdAt } },
                {
                    createdAt: beforeCursor.createdAt,
                    _id: { $lt: new mongoose.Types.ObjectId(beforeCursor.id) }
                }
            ];
        }

        const [comments, totalCount] = await Promise.all([
            this.findMany(query as SafeFilter<ILinkComment>, {
                sort: { createdAt: -1, _id: -1 }, // Newest first for pagination, but we will reverse for display if needed
                limit,
                populate: { path: 'userId', select: 'username' }
            }),
            this.count(query as SafeFilter<ILinkComment>)
        ]);

        return { comments, totalCount };
    }

    /**
     * Count comments for multiple links (for comment count display)
     */
    async countByLinkIds(linkIds: string[]): Promise<Record<string, number>> {
        if (linkIds.length === 0) return {};

        // Convert string IDs to ObjectIds for proper aggregation matching
        const objectIds = linkIds.map(id => new mongoose.Types.ObjectId(id));

        const results = await this.aggregate<{ _id: mongoose.Types.ObjectId; count: number }>([
            { $match: { linkId: { $in: objectIds } } },
            { $group: { _id: '$linkId', count: { $sum: 1 } } }
        ]);

        const countMap: Record<string, number> = {};
        results.forEach(r => {
            countMap[r._id.toString()] = r.count;
        });
        return countMap;
    }

    /**
     * Create a new comment with user populated
     */
    async createComment(linkId: string, userId: string, encryptedContent: string): Promise<ILinkComment> {
        const comment = await this.create({
            linkId: linkId as any,
            userId: userId as any,
            encryptedContent
        });
        // Populate user for username display
        await comment.populate('userId', 'username');
        return comment;
    }

    /**
     * Delete comment by ID if owned by user or user is room owner
     * Returns deleted comment or null if not found
     */
    async deleteByIdAndUser(commentId: string, userId: string): Promise<boolean> {
        // First find the comment to check ownership
        const comment = await this.findById(commentId);
        if (!comment) return false;

        // Only delete if user owns the comment
        if (comment.userId.toString() === userId) {
            return this.deleteById(commentId);
        }

        return false;
    }

    /**
     * Delete all comments for a link
     */
    async deleteByLinkId(linkId: string): Promise<number> {
        return this.deleteMany({
            linkId: { $eq: linkId as any }
        } as SafeFilter<ILinkComment>);
    }
}
