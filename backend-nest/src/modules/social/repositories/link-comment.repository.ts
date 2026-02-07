import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { BaseRepository } from '../../../common/repositories/base.repository';
import {
  LinkComment,
  LinkCommentDocument,
} from '../schemas/link-comment.schema';
import { SafeFilter } from '../../../common/repositories/types';

@Injectable()
export class LinkCommentRepository extends BaseRepository<LinkCommentDocument> {
  constructor(
    @InjectModel(LinkComment.name, 'primary')
    readonly linkCommentModel: Model<LinkCommentDocument>,
  ) {
    super(linkCommentModel);
  }

  async deleteByLinkId(linkId: string): Promise<number> {
    const validatedId = this.validateId(linkId);
    return this.deleteMany({
      linkId: { $eq: validatedId },
    } as unknown as SafeFilter<LinkCommentDocument>);
  }

  /**
   * Count comments for multiple links.
   * Returns a map of linkId to comment count.
   */
  async countByLinkIds(linkIds: string[]): Promise<Record<string, number>> {
    if (linkIds.length === 0) return {};

    const validatedIds = linkIds.map(
      (id) => new Types.ObjectId(this.validateId(id)),
    );

    const results = await this.linkCommentModel
      .aggregate<{
        _id: Types.ObjectId;
        count: number;
      }>([
        { $match: { linkId: { $in: validatedIds } } },
        { $group: { _id: '$linkId', count: { $sum: 1 } } },
      ])
      .exec();

    const countMap: Record<string, number> = {};
    results.forEach((r) => {
      countMap[r._id.toString()] = r.count;
    });
    return countMap;
  }
}
