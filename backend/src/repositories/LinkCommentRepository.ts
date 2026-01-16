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
     * Find comments by link ID with user population
     */
    async findByLinkId(linkId: string): Promise<ILinkComment[]> {
        return this.findMany({
            linkId: { $eq: linkId as any }
        } as SafeFilter<ILinkComment>, {
            sort: { createdAt: 1 },
            populate: { path: 'userId', select: 'username' }
        });
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
