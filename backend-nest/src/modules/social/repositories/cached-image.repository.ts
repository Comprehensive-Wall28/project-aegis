import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { CachedImage } from '../schemas/cached-image.schema';

/**
 * CachedImageRepository handles image cache lookups for GridFS
 * Cache expires after 30 days
 */
@Injectable()
export class CachedImageRepository {
  private readonly logger = new Logger(CachedImageRepository.name);

  constructor(
    @InjectModel(CachedImage.name)
    private readonly cachedImageModel: Model<CachedImage>,
  ) {}

  /**
   * Find cached image by URL
   */
  async findByUrl(url: string): Promise<CachedImage | null> {
    return this.cachedImageModel.findOne({ url }).exec();
  }

  /**
   * Create cache entry for a GridFS file
   */
  async create(
    url: string,
    fileId: Types.ObjectId,
    contentType: string,
    size: number,
  ): Promise<CachedImage> {
    const cachedImage = new this.cachedImageModel({
      url,
      fileId,
      contentType,
      size,
      lastFetched: new Date(),
    });
    return cachedImage.save();
  }

  /**
   * Create cache entry asynchronously (fire-and-forget)
   */
  createAsync(
    url: string,
    fileId: Types.ObjectId,
    contentType: string,
    size: number,
  ): void {
    const cachedImage = new this.cachedImageModel({
      url,
      fileId,
      contentType,
      size,
      lastFetched: new Date(),
    });
    cachedImage.save().catch((err) => {
      this.logger.error(`Failed to cache image metadata: ${err.message}`, err.stack);
    });
  }
}
