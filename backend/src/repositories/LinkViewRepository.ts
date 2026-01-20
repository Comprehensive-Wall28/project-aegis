import { BaseRepository } from './base/BaseRepository';
import logger from '../utils/logger';
import { ILinkView, LinkViewSchema } from '../models/LinkView';
import { SafeFilter } from './base/types';
import { DatabaseManager } from '../config/DatabaseManager';

/**
 * LinkViewRepository handles LinkView database operations on secondary DB
 * Used for tracking which links users have viewed (high-write, fire-and-forget)
 */
export class LinkViewRepository extends BaseRepository<ILinkView> {
    constructor() {
        const dbManager = DatabaseManager.getInstance();
        const connection = dbManager.getConnection('secondary');
        const model = connection.models['LinkView'] || connection.model<ILinkView>('LinkView', LinkViewSchema);
        super(model, 'secondary');
    }

    /**
     * Find viewed link IDs for a user within a set of links
     */
    async findViewedLinkIds(userId: string, linkIds: string[]): Promise<string[]> {
        const views = await this.findMany({
            userId: { $eq: userId as any },
            linkId: { $in: linkIds as any }
        } as SafeFilter<ILinkView>, {
            select: 'linkId',
            lean: true
        });
        return views.map(v => v.linkId.toString());
    }

    /**
     * Mark a link as viewed (upsert)
     */
    async markViewed(userId: string, linkId: string, collectionId?: string, roomId?: string): Promise<void> {
        await this.updateOne(
            {
                userId: { $eq: userId as any },
                linkId: { $eq: linkId as any }
            } as SafeFilter<ILinkView>,
            {
                $set: {
                    viewedAt: new Date(),
                    ...(collectionId && { collectionId: collectionId as any }),
                    ...(roomId && { roomId: roomId as any })
                }
            },
            { upsert: true }
        );
    }

    /**
     * Mark a link as viewed (fire-and-forget, no await needed)
     * Returns immediately, write happens asynchronously
     */
    markViewedAsync(userId: string, linkId: string, collectionId?: string, roomId?: string): void {
        this.updateOne(
            {
                userId: { $eq: userId as any },
                linkId: { $eq: linkId as any }
            } as SafeFilter<ILinkView>,
            {
                $set: {
                    viewedAt: new Date(),
                    ...(collectionId && { collectionId: collectionId as any }),
                    ...(roomId && { roomId: roomId as any })
                }
            },
            { upsert: true }
        ).catch(err => {
            // Log but don't throw - fire-and-forget pattern
            logger.error('Failed to mark link viewed:', err);
        });
    }

    /**
     * Unmark a link as viewed
     */
    async unmarkViewed(userId: string, linkId: string): Promise<boolean> {
        return this.deleteOne({
            userId: { $eq: userId as any },
            linkId: { $eq: linkId as any }
        } as SafeFilter<ILinkView>);
    }

    /**
     * Unmark a link as viewed (fire-and-forget)
     */
    unmarkViewedAsync(userId: string, linkId: string): void {
        this.deleteOne({
            userId: { $eq: userId as any },
            linkId: { $eq: linkId as any }
        } as SafeFilter<ILinkView>).catch(err => {
            logger.error('Failed to unmark link viewed:', err);
        });
    }
}
