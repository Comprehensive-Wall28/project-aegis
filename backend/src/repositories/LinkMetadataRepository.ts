import { BaseRepository } from './base/BaseRepository';
import { ILinkMetadata, LinkMetadataSchema } from '../models/LinkMetadata';
import { SafeFilter } from './base/types';
import { DatabaseManager } from '../config/DatabaseManager';
import logger from '../utils/logger';

/**
 * LinkMetadataRepository handles LinkMetadata cache operations on secondary DB
 * Used for caching scraped URL metadata with TTL
 */
export class LinkMetadataRepository extends BaseRepository<ILinkMetadata> {
    constructor() {
        const dbManager = DatabaseManager.getInstance();
        const connection = dbManager.getConnection('secondary');
        const model = connection.models['LinkMetadata'] || connection.model<ILinkMetadata>('LinkMetadata', LinkMetadataSchema);
        super(model, 'secondary');
    }

    /**
     * Find cached metadata by URL
     */
    async findByUrl(url: string): Promise<ILinkMetadata | null> {
        return this.findOne({
            url: { $eq: url }
        } as SafeFilter<ILinkMetadata>);
    }

    /**
     * Find cached metadata by URL, excluding failed entries
     */
    async findValidByUrl(url: string): Promise<ILinkMetadata | null> {
        return this.findOne({
            url: { $eq: url },
            scrapeStatus: { $ne: 'failed' as any }
        } as SafeFilter<ILinkMetadata>);
    }

    /**
     * Upsert metadata cache entry
     */
    async upsertMetadata(url: string, metadata: Partial<ILinkMetadata>): Promise<ILinkMetadata | null> {
        return this.updateOne(
            { url: { $eq: url } } as SafeFilter<ILinkMetadata>,
            {
                $set: {
                    ...metadata,
                    lastFetched: new Date()
                }
            },
            { upsert: true, returnNew: true }
        );
    }

    /**
     * Upsert metadata cache entry (fire-and-forget)
     * Returns immediately, write happens asynchronously
     */
    upsertMetadataAsync(url: string, metadata: Partial<ILinkMetadata>): void {
        this.updateOne(
            { url: { $eq: url } } as SafeFilter<ILinkMetadata>,
            {
                $set: {
                    ...metadata,
                    lastFetched: new Date()
                }
            },
            { upsert: true }
        ).catch(err => {
            logger.error('Failed to cache link metadata:', err);
        });
    }

    /**
     * Delete expired cache entries (manual cleanup if needed)
     */
    async deleteExpired(olderThanDays: number = 7): Promise<number> {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

        return this.deleteMany({
            lastFetched: { $lt: cutoffDate as any }
        } as SafeFilter<ILinkMetadata>);
    }
}
