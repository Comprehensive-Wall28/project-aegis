import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { BaseRepository } from '../../../common/repositories/base.repository';
import { LinkPost, LinkPostDocument } from '../schemas/link-post.schema';
import { SafeFilter } from '../../../common/repositories/types';
import { escapeRegex } from '../../../common/utils/regex-utils';

@Injectable()
export class LinkPostRepository extends BaseRepository<LinkPostDocument> {
  constructor(
    @InjectModel(LinkPost.name, 'primary')
    readonly linkPostModel: Model<LinkPostDocument>,
  ) {
    super(linkPostModel);
  }

  async findByCollections(
    collectionIds: string[],
  ): Promise<LinkPostDocument[]> {
    const validatedIds = collectionIds.map((id) => this.validateId(id));
    return this.findMany({
      collectionId: { $in: validatedIds },
    } as unknown as SafeFilter<LinkPostDocument>);
  }

  async deleteByCollection(collectionId: string): Promise<number> {
    const validatedId = this.validateId(collectionId);
    return this.deleteMany({
      collectionId: { $eq: validatedId },
    } as unknown as SafeFilter<LinkPostDocument>);
  }

  /**
   * Find links by collection with cursor-based pagination.
   * Uses createdAt + _id as a stable cursor for consistent pagination.
   */
  async findByCollectionCursor(
    collectionId: string,
    limit: number = 30,
    beforeCursor?: { createdAt: Date; id: string },
  ): Promise<{ links: LinkPostDocument[]; totalCount: number }> {
    const validatedCollectionId = new Types.ObjectId(
      this.validateId(collectionId),
    );

    let query: any;
    if (beforeCursor) {
      const validatedCursorId = new Types.ObjectId(
        this.validateId(beforeCursor.id),
      );
      query = {
        $and: [
          { collectionId: { $eq: validatedCollectionId } },
          {
            $or: [
              { createdAt: { $lt: beforeCursor.createdAt } },
              {
                createdAt: { $eq: beforeCursor.createdAt },
                _id: { $lt: validatedCursorId },
              },
            ],
          },
        ],
      };
    } else {
      query = { collectionId: { $eq: validatedCollectionId } };
    }

    const [links, totalCount] = await Promise.all([
      this.linkPostModel
        .find(query)
        .sort({ createdAt: -1, _id: -1 })
        .limit(limit)
        .populate({ path: 'userId', select: 'username' })
        .exec(),
      this.linkPostModel.countDocuments({
        collectionId: { $eq: validatedCollectionId },
      }),
    ]);

    return { links, totalCount };
  }

  async findByCollectionAndUrl(
    collectionId: string,
    url: string,
  ): Promise<LinkPostDocument | null> {
    const validatedId = new Types.ObjectId(this.validateId(collectionId));
    return this.findOne({
      collectionId: { $eq: validatedId },
      url: { $eq: url },
    } as unknown as SafeFilter<LinkPostDocument>);
  }

  async createWithPopulate(data: {
    collectionId: string;
    userId: string;
    url: string;
    previewData: { title: string; scrapeStatus: string };
  }): Promise<LinkPostDocument> {
    const linkPost = await this.create({
      collectionId: new Types.ObjectId(data.collectionId),
      userId: new Types.ObjectId(data.userId),
      url: data.url,
      previewData: data.previewData,
    } as any);

    await linkPost.populate({ path: 'userId', select: 'username' });
    return linkPost;
  }

  /**
   * Get aggregate counts of links per collection
   */
  async groupCountByCollections(
    collectionIds: string[],
  ): Promise<{ _id: string; count: number }[]> {
    const validatedIds = collectionIds.map(
      (id) => new Types.ObjectId(this.validateId(id)),
    );
    const results = await this.aggregate<{
      _id: Types.ObjectId;
      count: number;
    }>([
      { $match: { collectionId: { $in: validatedIds } } },
      { $group: { _id: '$collectionId', count: { $sum: 1 } } },
    ]);

    return results.map((r) => ({
      _id: r._id.toString(),
      count: r.count,
    }));
  }

  /**
   * Search links across multiple collections with basic regex matching
   */
  async searchLinks(
    collectionIds: string[],
    searchQuery: string,
    limit: number = 50,
  ): Promise<LinkPostDocument[]> {
    const safeQuery = escapeRegex(searchQuery);
    const validatedIds = collectionIds.map(
      (id) => new Types.ObjectId(this.validateId(id)),
    );

    const query: any = {
      collectionId: { $in: validatedIds },
      $or: [
        { url: { $regex: safeQuery, $options: 'i' } },
        { 'previewData.title': { $regex: safeQuery, $options: 'i' } },
        { 'previewData.description': { $regex: safeQuery, $options: 'i' } },
      ],
    };

    return this.findMany(query as unknown as SafeFilter<LinkPostDocument>, {
      sort: { createdAt: -1 },
      populate: { path: 'userId', select: 'username' },
      limit,
    });
  }

  async updateCollection(
    linkId: string,
    collectionId: string,
  ): Promise<LinkPostDocument | null> {
    const validatedLinkId = this.validateId(linkId);
    const validatedCollectionId = new Types.ObjectId(
      this.validateId(collectionId),
    );

    return this.updateById(validatedLinkId, {
      $set: { collectionId: validatedCollectionId },
    });
  }
}
