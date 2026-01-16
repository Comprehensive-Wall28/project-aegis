import { BaseRepository } from './base/BaseRepository';
import LinkPost, { ILinkPost, IPreviewData } from '../models/LinkPost';
import { SafeFilter } from './base/types';

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
     * Find links by single collection with pagination
     */
    async findByCollectionPaginated(
        collectionId: string,
        limit: number = 30,
        skip: number = 0
    ): Promise<{ links: ILinkPost[]; totalCount: number }> {
        const [links, totalCount] = await Promise.all([
            this.findMany({
                collectionId: { $eq: collectionId as any }
            } as SafeFilter<ILinkPost>, {
                sort: { createdAt: -1 },
                populate: { path: 'userId', select: 'username' },
                limit,
                skip
            }),
            this.count({
                collectionId: { $eq: collectionId as any }
            } as SafeFilter<ILinkPost>)
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
}
