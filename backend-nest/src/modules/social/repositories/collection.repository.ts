import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { BaseRepository } from '../../../common/repositories/base.repository';
import { Collection, CollectionDocument } from '../schemas/collection.schema';
import { SafeFilter, QueryOptions } from '../../../common/repositories/types';

@Injectable()
export class CollectionRepository extends BaseRepository<CollectionDocument> {
  constructor(
    @InjectModel(Collection.name, 'primary')
    readonly collectionModel: Model<CollectionDocument>,
  ) {
    super(collectionModel);
  }

  async findByRoom(
    roomId: string,
    options: QueryOptions = {},
  ): Promise<CollectionDocument[]> {
    const filter = {
      roomId: { $eq: new Types.ObjectId(roomId) },
    };

    return this.findMany(filter as unknown as SafeFilter<CollectionDocument>, {
      select: '_id roomId name type order',
      ...options,
    });
  }

  async findByIdAndRoom(
    collectionId: string,
    roomId: string,
  ): Promise<CollectionDocument | null> {
    const validatedCollectionId = this.validateId(collectionId);
    const validatedRoomId = new Types.ObjectId(this.validateId(roomId));

    return this.findOne({
      _id: { $eq: validatedCollectionId }, // String - sanitizer handles conversion
      roomId: { $eq: validatedRoomId }, // ObjectId - not handled specially by sanitizer
    } as unknown as SafeFilter<CollectionDocument>);
  }

  async deleteByRoom(roomId: string): Promise<number> {
    return this.deleteMany({
      roomId: { $eq: new Types.ObjectId(roomId) },
    } as unknown as SafeFilter<CollectionDocument>);
  }

  async countByRoom(roomId: string): Promise<number> {
    return this.count({
      roomId: { $eq: new Types.ObjectId(roomId) },
    } as unknown as SafeFilter<CollectionDocument>);
  }

  async bulkUpdateOrders(collectionIds: string[]): Promise<void> {
    const bulkOps = collectionIds.map((id, index) => ({
      updateOne: {
        filter: { _id: new Types.ObjectId(id) },
        update: { $set: { order: index } },
      },
    }));

    await this.collectionModel.bulkWrite(bulkOps);
  }

  async findDefaultLinksCollection(
    roomId: string,
  ): Promise<CollectionDocument | null> {
    return this.findOne({
      roomId: { $eq: new Types.ObjectId(roomId) },
      name: { $eq: '' },
      type: { $eq: 'links' },
    } as unknown as SafeFilter<CollectionDocument>);
  }
}
