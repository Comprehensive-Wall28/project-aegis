import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  LinkMetadata,
  LinkMetadataDocument,
} from '../schemas/link-metadata.schema';

@Injectable()
export class LinkMetadataRepository {
  constructor(
    @InjectModel(LinkMetadata.name, 'primary')
    private readonly linkMetadataModel: Model<LinkMetadataDocument>,
  ) {}

  async findByUrl(url: string): Promise<LinkMetadataDocument | null> {
    return this.linkMetadataModel
      .findOne({ url: { $eq: url } })
      .lean()
      .exec();
  }

  async findValidByUrl(url: string): Promise<LinkMetadataDocument | null> {
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    return this.linkMetadataModel
      .findOne({
        url: { $eq: url },
        lastFetched: { $gte: oneWeekAgo },
      })
      .lean()
      .exec();
  }

  async upsertMetadata(
    url: string,
    metadata: Partial<LinkMetadata>,
  ): Promise<LinkMetadataDocument | null> {
    return this.linkMetadataModel
      .findOneAndUpdate(
        { url: { $eq: url } },
        {
          $set: {
            ...metadata,
            url,
            lastFetched: new Date(),
          },
        },
        { upsert: true, new: true },
      )
      .exec();
  }

  upsertMetadataAsync(url: string, metadata: Partial<LinkMetadata>): void {
    // Fire-and-forget async operation
    this.linkMetadataModel
      .findOneAndUpdate(
        { url: { $eq: url } },
        {
          $set: {
            ...metadata,
            url,
            lastFetched: new Date(),
          },
        },
        { upsert: true, new: true },
      )
      .exec()
      .catch((err) => {
        console.error('Failed to upsert link metadata:', err);
      });
  }

  async deleteByUrl(url: string): Promise<void> {
    await this.linkMetadataModel.deleteOne({ url: { $eq: url } }).exec();
  }

  async cleanupExpired(): Promise<void> {
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    await this.linkMetadataModel
      .deleteMany({
        lastFetched: { $lt: oneWeekAgo },
      })
      .exec();
  }
}
