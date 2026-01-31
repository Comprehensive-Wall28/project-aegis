import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { LinkMetadata } from '../schemas/link-metadata.schema';

/**
 * LinkMetadataRepository handles link metadata caching on secondary (audit) DB
 * Cache expires after 7 days
 */
@Injectable()
export class LinkMetadataRepository {
  private readonly logger = new Logger(LinkMetadataRepository.name);

  constructor(
    @InjectModel(LinkMetadata.name, 'audit')
    private readonly linkMetadataModel: Model<LinkMetadata>,
  ) {}

  /**
   * Find cached metadata by URL
   */
  async findByUrl(url: string): Promise<LinkMetadata | null> {
    return this.linkMetadataModel.findOne({ url }).exec();
  }

  /**
   * Upsert metadata cache entry (fire-and-forget for background caching)
   */
  async upsert(data: Partial<LinkMetadata>): Promise<void> {
    await this.linkMetadataModel
      .updateOne(
        { url: data.url },
        {
          $set: {
            ...data,
            lastFetched: new Date(),
          },
        },
        { upsert: true },
      )
      .exec();
  }

  /**
   * Upsert metadata cache asynchronously (fire-and-forget)
   */
  upsertAsync(data: Partial<LinkMetadata>): void {
    this.linkMetadataModel
      .updateOne(
        { url: data.url },
        {
          $set: {
            ...data,
            lastFetched: new Date(),
          },
        },
        { upsert: true },
      )
      .exec()
      .catch((err) => {
        this.logger.error(`Failed to cache link metadata: ${err.message}`, err.stack);
      });
  }
}
