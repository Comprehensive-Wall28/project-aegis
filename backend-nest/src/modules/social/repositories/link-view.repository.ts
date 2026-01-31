import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { LinkView } from '../schemas/link-view.schema';

/**
 * LinkViewRepository handles LinkView operations on secondary (audit) DB
 * Used for tracking which links users have viewed (high-write, fire-and-forget)
 */
@Injectable()
export class LinkViewRepository {
  private readonly logger = new Logger(LinkViewRepository.name);

  constructor(
    @InjectModel(LinkView.name, 'audit')
    private readonly linkViewModel: Model<LinkView>,
  ) { }

  /**
   * Find viewed link IDs for a user within a set of links
   */
  async findViewedLinkIds(userId: string, linkIds: string[]): Promise<string[]> {
    const views = await this.linkViewModel
      .find({
        userId: new Types.ObjectId(userId),
        linkId: { $in: linkIds.map((id) => new Types.ObjectId(id)) },
      })
      .select('linkId')
      .lean()
      .exec();
    return views.map((v) => v.linkId.toString());
  }

  /**
   * Find multiple views matching a filter
   */
  async findMany(filter: any, options: any = {}): Promise<any> {
    let query: any = this.linkViewModel.find(filter);
    if (options.select) query = query.select(options.select);
    if (options.lean) query = query.lean();
    return query.exec();
  }

  /**
   * Mark a link as viewed (fire-and-forget, no await needed)
   * Returns immediately, write happens asynchronously
   */
  markViewedAsync(
    userId: string,
    linkId: string,
    collectionId?: string,
    roomId?: string,
  ): void {
    const updateData: any = {
      viewedAt: new Date(),
    };
    if (collectionId) updateData.collectionId = new Types.ObjectId(collectionId);
    if (roomId) updateData.roomId = new Types.ObjectId(roomId);

    this.linkViewModel
      .updateOne(
        {
          userId: new Types.ObjectId(userId),
          linkId: new Types.ObjectId(linkId),
        },
        { $set: updateData },
        { upsert: true },
      )
      .exec()
      .catch((err) => {
        // Log but don't throw - fire-and-forget pattern
        this.logger.error(`Failed to mark link viewed: ${err.message}`, err.stack);
      });
  }

  /**
   * Unmark a link as viewed (fire-and-forget)
   */
  unmarkViewedAsync(userId: string, linkId: string): void {
    this.linkViewModel
      .deleteOne({
        userId: new Types.ObjectId(userId),
        linkId: new Types.ObjectId(linkId),
      })
      .exec()
      .catch((err) => {
        this.logger.error(`Failed to unmark link viewed: ${err.message}`, err.stack);
      });
  }

  /**
   * Delete all views for a link (cascade, fire-and-forget)
   */
  deleteByLinkIdAsync(linkId: string): void {
    this.linkViewModel
      .deleteMany({ linkId: new Types.ObjectId(linkId) })
      .exec()
      .catch((err) => {
        this.logger.error(`Failed to delete link views: ${err.message}`, err.stack);
      });
  }
}
