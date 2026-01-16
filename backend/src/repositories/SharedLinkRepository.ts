import { BaseRepository } from './base/BaseRepository';
import SharedLink, { ISharedLink } from '../models/SharedLink';
import { SafeFilter } from './base/types';

/**
 * SharedLinkRepository handles SharedLink database operations
 */
export class SharedLinkRepository extends BaseRepository<ISharedLink> {
    constructor() {
        super(SharedLink);
    }

    /**
     * Find shared link by token
     */
    async findByToken(token: string): Promise<ISharedLink | null> {
        return this.findOne({
            token: { $eq: token }
        } as unknown as SafeFilter<ISharedLink>);
    }

    /**
     * Increment view count
     */
    async incrementViewCount(token: string): Promise<ISharedLink | null> {
        return this.updateOne(
            { token: { $eq: token } } as unknown as SafeFilter<ISharedLink>,
            { $inc: { views: 1 } },
            { returnNew: true }
        );
    }
    /**
     * Find links by creator with pagination and population
     */
    async findLinksByCreator(userId: string, skip: number, limit: number): Promise<any> {
        const total = await this.model.countDocuments({ creatorId: userId });
        const links = await this.model.find({ creatorId: userId })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);
        return { links, total };
    }
}
