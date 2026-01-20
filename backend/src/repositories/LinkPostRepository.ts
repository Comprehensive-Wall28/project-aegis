import { BaseRepository } from './base/BaseRepository';
import LinkPost, { ILinkPost, IPreviewData } from '../models/LinkPost';
import { SafeFilter } from './base/types';
import mongoose from 'mongoose';
import { escapeRegex } from '../utils/regexUtils';

/**
 * LinkPostRepository handles LinkPost database operations
 */
export class LinkPostRepository extends BaseRepository<ILinkPost> {
    constructor() {
        super(LinkPost);
    }

    /**
     * Find links by collection IDs
     */
    async findByCollections(collectionIds: string[]): Promise<ILinkPost[]> {
        return this.findMany({
            collectionId: { $in: collectionIds as any }
        } as SafeFilter<ILinkPost>, {
            sort: { createdAt: -1 },
            populate: { path: 'userId', select: 'username' }
        });
    }

    /**
     * Lightweight fetch of link IDs and collection IDs for unviewed count calculation
     */
    async findIdsAndCollectionsByCollections(collectionIds: string[]): Promise<{ _id: string; collectionId: string }[]> {
        return this.findMany({
            collectionId: { $in: collectionIds as any }
        } as SafeFilter<ILinkPost>, {
            select: '_id collectionId',
            lean: true
        }) as any;
    }

    /**
     * Find links by single collection with cursor-based pagination
     * Uses createdAt + _id as a stable cursor
     */
    async findByCollectionCursor(
        collectionId: string,
        limit: number = 30,
        beforeCursor?: { createdAt: Date; id: string }
    ): Promise<{ links: ILinkPost[]; totalCount: number }> {
        const query: any = { collectionId: { $eq: collectionId as any } };

        if (beforeCursor) {
            query.$or = [
                { createdAt: { $lt: beforeCursor.createdAt } },
                { createdAt: beforeCursor.createdAt, _id: { $lt: new mongoose.Types.ObjectId(beforeCursor.id) } }
            ];
        }

        const [links, totalCount] = await Promise.all([
            this.findMany(query as SafeFilter<ILinkPost>, {
                sort: { createdAt: -1, _id: -1 },
                populate: { path: 'userId', select: 'username' },
                limit
            }),
            this.count({ collectionId: { $eq: collectionId as any } } as SafeFilter<ILinkPost>)
        ]);

        return { links, totalCount };
    }

    /**
     * Find existing link in collection by URL
     */
    async findByCollectionAndUrl(collectionId: string, url: string): Promise<ILinkPost | null> {
        return this.findOne({
            collectionId: { $eq: collectionId as any },
            url: { $eq: url as any }
        } as SafeFilter<ILinkPost>);
    }

    /**
     * Update link's collection (move)
     */
    async updateCollection(linkId: string, collectionId: string): Promise<ILinkPost | null> {
        return this.updateById(linkId, { $set: { collectionId } } as any);
    }

    /**
     * Delete all links in a collection
     */
    async deleteByCollection(collectionId: string): Promise<number> {
        return this.deleteMany({
            collectionId: { $eq: collectionId as any }
        } as SafeFilter<ILinkPost>);
    }

    /**
     * Get aggregate counts of links per collection
     */
    async groupCountByCollections(collectionIds: string[]): Promise<{ _id: string; count: number }[]> {
        const results = await this.model.aggregate([
            { $match: { collectionId: { $in: collectionIds.map(id => new mongoose.Types.ObjectId(id)) } } },
            { $group: { _id: '$collectionId', count: { $sum: 1 } } }
        ]);
        return results;
    }

    /**
     * Search links across multiple collections with basic regex matching
     */
    async searchLinks(
        collectionIds: string[],
        searchQuery: string,
        limit: number = 50
    ): Promise<ILinkPost[]> {
        const safeQuery = escapeRegex(searchQuery);

        const query: any = {
            collectionId: { $in: collectionIds.map(id => new mongoose.Types.ObjectId(id)) },
            $or: [
                { url: { $regex: safeQuery, $options: 'i' } },
                { 'previewData.title': { $regex: safeQuery, $options: 'i' } },
                { 'previewData.description': { $regex: safeQuery, $options: 'i' } }
            ]
        };

        return this.findMany(query as SafeFilter<ILinkPost>, {
            sort: { createdAt: -1 },
            populate: { path: 'userId', select: 'username' },
            limit
        });
    }
}
