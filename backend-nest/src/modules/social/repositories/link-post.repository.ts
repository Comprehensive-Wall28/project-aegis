import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { LinkPost } from '../schemas/link-post.schema';

@Injectable()
export class LinkPostRepository {
  private readonly logger = new Logger(LinkPostRepository.name);

  constructor(
    @InjectModel(LinkPost.name)
    private readonly linkPostModel: Model<LinkPost>,
  ) {}

  /**
   * Create a new link post
   */
  async create(data: Partial<LinkPost>): Promise<LinkPost> {
    const linkPost = new this.linkPostModel(data);
    return linkPost.save();
  }

  /**
   * Find link by ID
   */
  async findById(linkId: string): Promise<LinkPost | null> {
    return this.linkPostModel.findById(linkId).exec();
  }

  /**
   * Find links by collection with cursor-based pagination
   * Uses createdAt + _id as a stable cursor
   */
  async findByCollectionCursor(
    collectionId: string,
    limit: number = 30,
    beforeCursor?: { createdAt: Date; id: string },
  ): Promise<{ links: LinkPost[]; totalCount: number }> {
    const query: any = { collectionId: new Types.ObjectId(collectionId) };

    if (beforeCursor) {
      query.$or = [
        { createdAt: { $lt: beforeCursor.createdAt } },
        {
          createdAt: beforeCursor.createdAt,
          _id: { $lt: new Types.ObjectId(beforeCursor.id) },
        },
      ];
    }

    const [links, totalCount] = await Promise.all([
      this.linkPostModel
        .find(query)
        .sort({ createdAt: -1, _id: -1 })
        .limit(limit)
        .populate('userId', 'username')
        .exec(),
      this.linkPostModel
        .countDocuments({ collectionId: new Types.ObjectId(collectionId) })
        .exec(),
    ]);

    return { links, totalCount };
  }

  /**
   * Find existing link in collection by URL (for duplicate check)
   */
  async findByCollectionAndUrl(
    collectionId: string,
    url: string,
  ): Promise<LinkPost | null> {
    return this.linkPostModel
      .findOne({
        collectionId: new Types.ObjectId(collectionId),
        url,
      })
      .exec();
  }

  /**
   * Get aggregate counts of links per collection
   */
  async groupCountByCollections(
    collectionIds: string[],
  ): Promise<{ _id: string; count: number }[]> {
    const results = await this.linkPostModel.aggregate([
      {
        $match: {
          collectionId: {
            $in: collectionIds.map((id) => new Types.ObjectId(id)),
          },
        },
      },
      { $group: { _id: '$collectionId', count: { $sum: 1 } } },
    ]);
    return results.map((r) => ({ _id: r._id.toString(), count: r.count }));
  }

  /**
   * Search links across multiple collections with basic regex matching
   */
  async searchLinks(
    collectionIds: string[],
    searchQuery: string,
    limit: number = 50,
  ): Promise<LinkPost[]> {
    // Escape regex special characters
    const escapedQuery = searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    return this.linkPostModel
      .find({
        collectionId: {
          $in: collectionIds.map((id) => new Types.ObjectId(id)),
        },
        $or: [
          { url: { $regex: escapedQuery, $options: 'i' } },
          { 'previewData.title': { $regex: escapedQuery, $options: 'i' } },
          {
            'previewData.description': { $regex: escapedQuery, $options: 'i' },
          },
        ],
      })
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate('userId', 'username')
      .exec();
  }

  /**
   * Update link preview data
   */
  async updatePreviewData(
    linkId: string,
    previewData: Partial<LinkPost['previewData']>,
  ): Promise<LinkPost | null> {
    return this.linkPostModel
      .findByIdAndUpdate(linkId, { $set: { previewData } }, { new: true })
      .populate('userId', 'username')
      .exec();
  }

  /**
   * Update link's collection (move)
   */
  async updateCollection(
    linkId: string,
    collectionId: string,
  ): Promise<LinkPost | null> {
    return this.linkPostModel
      .findByIdAndUpdate(
        linkId,
        { $set: { collectionId: new Types.ObjectId(collectionId) } },
        { new: true },
      )
      .exec();
  }

  /**
   * Delete link by ID
   */
  async deleteById(linkId: string): Promise<boolean> {
    const result = await this.linkPostModel.deleteOne({ _id: linkId }).exec();
    return result.deletedCount > 0;
  }

  /**
   * Delete all links in a collection
   */
  async deleteByCollection(collectionId: string): Promise<number> {
    const result = await this.linkPostModel
      .deleteMany({ collectionId: new Types.ObjectId(collectionId) })
      .exec();
    return result.deletedCount;
  }
}
