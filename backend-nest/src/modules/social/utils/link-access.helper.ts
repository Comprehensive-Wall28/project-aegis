import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { LinkPost } from '../schemas/link-post.schema';

export interface LinkAccessResult {
  link: any;
  collectionId: string;
  roomId: string;
  room: any;
}

/**
 * Helper service for verifying link access with optimized aggregation pipeline
 */
@Injectable()
export class LinkAccessHelper {
  constructor(
    @InjectModel(LinkPost.name)
    private readonly linkPostModel: Model<LinkPost>,
  ) {}

  /**
   * Optimized helper to verify link access in a single query.
   * Jointly checks LinkPost, Collection, and Room membership.
   */
  async verifyLinkAccess(
    linkId: string,
    userId: string,
  ): Promise<LinkAccessResult> {
    const results = await this.linkPostModel.aggregate([
      {
        $match: {
          _id: new Types.ObjectId(linkId),
        },
      },
      {
        $lookup: {
          from: 'collections',
          localField: 'collectionId',
          foreignField: '_id',
          as: 'collection',
        },
      },
      { $unwind: '$collection' },
      {
        $lookup: {
          from: 'rooms',
          localField: 'collection.roomId',
          foreignField: '_id',
          as: 'room',
        },
      },
      { $unwind: '$room' },
      {
        $match: {
          'room.members.userId': new Types.ObjectId(userId),
        },
      },
      {
        $project: {
          _id: 1,
          collectionId: 1,
          userId: 1,
          url: 1,
          previewData: 1,
          createdAt: 1,
          'collection._id': 1,
          'collection.roomId': 1,
          'collection.name': 1,
          'collection.type': 1,
          'room._id': 1,
          'room.name': 1,
          'room.members': 1,
        },
      },
    ]);

    if (!results || results.length === 0) {
      throw new NotFoundException('Link not found or access denied');
    }

    const result = results[0];
    return {
      link: result,
      collectionId: result.collectionId.toString(),
      roomId: result.collection.roomId.toString(),
      room: result.room,
    };
  }
}
