import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ReaderContentCache } from '../schemas/reader-content-cache.schema';

@Injectable()
export class ReaderContentCacheRepository {
    private readonly logger = new Logger(ReaderContentCacheRepository.name);

    constructor(
        @InjectModel(ReaderContentCache.name)
        private readonly cacheModel: Model<ReaderContentCache>,
    ) { }

    async findValidByUrl(url: string): Promise<ReaderContentCache | null> {
        // TTL index handles expiration automatically in MongoDB
        return this.cacheModel.findOne({ url }).exec();
    }

    async upsertContent(url: string, data: any): Promise<void> {
        try {
            await this.cacheModel.updateOne(
                { url },
                {
                    $set: {
                        ...data,
                        lastFetched: new Date(),
                    },
                },
                { upsert: true },
            ).exec();
        } catch (err: any) {
            this.logger.error(`Failed to upsert reader content cache for ${url}: ${err.message}`);
        }
    }
}
