import ReaderContentCache, { IReaderContentCache } from '../models/ReaderContentCache';
import { ReaderContentResult } from '../utils/scraper';
import logger from '../utils/logger';

export class ReaderContentCacheRepository {
    /**
     * Find cached reader content by URL (if not expired)
     */
    async findByUrl(url: string): Promise<IReaderContentCache | null> {
        try {
            return await ReaderContentCache.findOne({ url }).lean();
        } catch (error) {
            logger.error('Error finding cached reader content:', error);
            return null;
        }
    }

    /**
     * Upsert reader content cache
     */
    async upsertContent(url: string, content: ReaderContentResult): Promise<void> {
        try {
            await ReaderContentCache.findOneAndUpdate(
                { url },
                {
                    url,
                    title: content.title,
                    byline: content.byline,
                    content: content.content,
                    textContent: content.textContent,
                    siteName: content.siteName,
                    status: content.status,
                    error: content.error,
                    lastFetched: new Date()
                },
                { upsert: true, new: true }
            );
        } catch (error) {
            // Log but don't throw - caching is best-effort
            logger.error('Error upserting reader content cache:', error);
        }
    }

    /**
     * Delete cached content for a URL
     */
    async deleteByUrl(url: string): Promise<void> {
        try {
            await ReaderContentCache.deleteOne({ url });
        } catch (error) {
            logger.error('Error deleting cached reader content:', error);
        }
    }
}
