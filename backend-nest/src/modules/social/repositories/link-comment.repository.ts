import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { LinkComment } from '../schemas/link-comment.schema';

@Injectable()
export class LinkCommentRepository {
  private readonly logger = new Logger(LinkCommentRepository.name);

  constructor(
    @InjectModel(LinkComment.name)
    private readonly linkCommentModel: Model<LinkComment>,
  ) {}

  /**
   * Create a new comment with user populated
   */
  async create(
    linkId: string,
    userId: string,
    encryptedContent: string,
  ): Promise<LinkComment> {
    const comment = new this.linkCommentModel({
      linkId: new Types.ObjectId(linkId),
      userId: new Types.ObjectId(userId),
      encryptedContent,
    });
    await comment.save();
    await comment.populate('userId', 'username');
    return comment;
  }

  /**
   * Find comment by ID
   */
  async findById(commentId: string): Promise<LinkComment | null> {
    return this.linkCommentModel.findById(commentId).exec();
  }

  /**
   * Find comments by link ID with pagination and user population
   */
  async findByLinkIdWithPagination(
    linkId: string,
    limit: number = 20,
    beforeCursor?: { createdAt: Date; id: string },
  ): Promise<{ comments: LinkComment[]; totalCount: number }> {
    const query: any = { linkId: new Types.ObjectId(linkId) };

    if (beforeCursor) {
      query.$or = [
        { createdAt: { $lt: beforeCursor.createdAt } },
        {
          createdAt: beforeCursor.createdAt,
          _id: { $lt: new Types.ObjectId(beforeCursor.id) },
        },
      ];
    }

    const [comments, totalCount] = await Promise.all([
      this.linkCommentModel
        .find(query)
        .sort({ createdAt: -1, _id: -1 })
        .limit(limit)
        .populate('userId', 'username')
        .exec(),
      this.linkCommentModel
        .countDocuments({ linkId: new Types.ObjectId(linkId) })
        .exec(),
    ]);

    return { comments, totalCount };
  }

  /**
   * Count comments for multiple links (batch aggregation)
   */
  async countByLinkIds(linkIds: string[]): Promise<Record<string, number>> {
    if (linkIds.length === 0) return {};

    const objectIds = linkIds.map((id) => new Types.ObjectId(id));

    const results = await this.linkCommentModel.aggregate([
      { $match: { linkId: { $in: objectIds } } },
      { $group: { _id: '$linkId', count: { $sum: 1 } } },
    ]);

    const countMap: Record<string, number> = {};
    results.forEach((r) => {
      countMap[r._id.toString()] = r.count;
    });
    return countMap;
  }

  /**
   * Delete comment by ID
   */
  async deleteById(commentId: string): Promise<boolean> {
    const result = await this.linkCommentModel
      .deleteOne({ _id: commentId })
      .exec();
    return result.deletedCount > 0;
  }

  /**
   * Delete all comments for a link (cascade)
   */
  async deleteByLinkId(linkId: string): Promise<number> {
    const result = await this.linkCommentModel
      .deleteMany({ linkId: new Types.ObjectId(linkId) })
      .exec();
    return result.deletedCount;
  }
}
