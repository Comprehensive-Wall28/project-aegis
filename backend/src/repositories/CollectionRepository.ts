import { BaseRepository } from './base/BaseRepository';
import Collection, { ICollection } from '../models/Collection';
import { SafeFilter } from './base/types';

/**
 * CollectionRepository handles Collection database operations
 */
export class CollectionRepository extends BaseRepository<ICollection> {
    constructor() {
        super(Collection);
    }

    /**
     * Find collections by room ID, sorted by order
     */
    async findByRoom(roomId: string): Promise<ICollection[]> {
        return this.findMany({
            roomId: { $eq: roomId as any }
        } as SafeFilter<ICollection>, {
            sort: { order: 1 }
        });
    }

    /**
     * Count collections in a room
     */
    async countByRoom(roomId: string): Promise<number> {
        return this.count({
            roomId: { $eq: roomId as any }
        } as SafeFilter<ICollection>);
    }

    /**
     * Find collection by ID and room ID
     */
    async findByIdAndRoom(collectionId: string, roomId: string): Promise<ICollection | null> {
        return this.findOne({
            _id: collectionId,
            roomId: { $eq: roomId as any }
        } as SafeFilter<ICollection>);
    }

    /**
     * Find default links collection for a room
     */
    async findDefaultLinksCollection(roomId: string): Promise<ICollection | null> {
        return this.findOne({
            roomId: { $eq: roomId as any },
            type: { $eq: 'links' as any }
        } as SafeFilter<ICollection>);
    }
}
