import { BaseRepository } from './base/BaseRepository';
import MerkleRegistry, { IMerkleRegistry } from '../models/MerkleRegistry';
import { SafeFilter } from './base/types';

/**
 * MerkleRegistryRepository handles MerkleRegistry database operations
 */
export class MerkleRegistryRepository extends BaseRepository<IMerkleRegistry> {
    constructor() {
        super(MerkleRegistry);
    }

    /**
     * Find registry by user
     */
    async findByUser(userId: string): Promise<IMerkleRegistry | null> {
        return this.findOne({
            userId: { $eq: userId }
        } as unknown as SafeFilter<IMerkleRegistry>);
    }

    /**
     * Upsert Merkle root for user
     */
    async upsertRoot(userId: string, merkleRoot: string): Promise<IMerkleRegistry | null> {
        return this.model.findOneAndUpdate(
            { userId },
            { merkleRoot },
            { upsert: true, new: true }
        );
    }
}
