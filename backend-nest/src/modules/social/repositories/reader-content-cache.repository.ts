import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  ReaderContentCache,
  ReaderContentCacheDocument,
} from '../schemas/reader-content-cache.schema';

export interface ReaderContentResult {
  title: string;
  byline: string | null;
  content: string;
  textContent: string;
  siteName: string | null;
  status: 'success' | 'blocked' | 'failed';
  error?: string;
}

@Injectable()
export class ReaderContentCacheRepository {
  constructor(
    @InjectModel(ReaderContentCache.name, 'primary')
    private readonly readerContentCacheModel: Model<ReaderContentCacheDocument>,
  ) {}

  async findByUrl(url: string): Promise<ReaderContentCacheDocument | null> {
    return this.readerContentCacheModel
      .findOne({ url: { $eq: url } })
      .lean()
      .exec();
  }

  async findValidByUrl(
    url: string,
  ): Promise<ReaderContentCacheDocument | null> {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    return this.readerContentCacheModel
      .findOne({
        url: { $eq: url },
        lastFetched: { $gte: thirtyDaysAgo },
      })
      .lean()
      .exec();
  }

  async upsertContent(
    url: string,
    content: ReaderContentResult,
  ): Promise<ReaderContentCacheDocument | null> {
    return this.readerContentCacheModel
      .findOneAndUpdate(
        { url: { $eq: url } },
        {
          $set: {
            ...content,
            url,
            lastFetched: new Date(),
          },
        },
        { upsert: true, new: true },
      )
      .exec();
  }

  upsertContentAsync(url: string, content: ReaderContentResult): void {
    // Fire-and-forget async operation
    this.readerContentCacheModel
      .findOneAndUpdate(
        { url: { $eq: url } },
        {
          $set: {
            ...content,
            url,
            lastFetched: new Date(),
          },
        },
        { upsert: true, new: true },
      )
      .exec()
      .catch((err) => {
        console.error('Failed to upsert reader content cache:', err);
      });
  }

  async deleteByUrl(url: string): Promise<void> {
    await this.readerContentCacheModel.deleteOne({ url: { $eq: url } }).exec();
  }

  async cleanupExpired(): Promise<void> {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    await this.readerContentCacheModel
      .deleteMany({
        lastFetched: { $lt: thirtyDaysAgo },
      })
      .exec();
  }
}
