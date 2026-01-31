import mongoose from 'mongoose';
import { BaseRepository } from './base/BaseRepository';
import NoteFolder, { INoteFolder } from '../models/NoteFolder';
import { SafeFilter } from './base/types';

/**
 * NoteFolderRepository handles all NoteFolder-related database operations
 */
export class NoteFolderRepository extends BaseRepository<INoteFolder> {
    constructor() {
        super(NoteFolder);
    }

    /**
     * Find all folders for a user
     */
    async findByUserId(userId: string): Promise<INoteFolder[]> {
        return this.findMany({
            userId: { $eq: userId }
        }, {
            sort: { name: 1 }
        });
    }

    /**
     * Find folders by parent (for tree structure)
     */
    async findByParentId(userId: string, parentId: string | null): Promise<INoteFolder[]> {
        const filter: SafeFilter<INoteFolder> = {
            userId: { $eq: userId }
        };

        if (parentId === null) {
            (filter as any).parentId = { $eq: null };
        } else {
            (filter as any).parentId = { $eq: new mongoose.Types.ObjectId(parentId) };
        }

        return this.findMany(filter, {
            sort: { name: 1 }
        });
    }

    /**
     * Find folder by ID and verify ownership
     */
    async findByIdAndUser(folderId: string, userId: string): Promise<INoteFolder | null> {
        return this.findOne({
            _id: folderId,
            userId: { $eq: userId }
        } as SafeFilter<INoteFolder>);
    }

    /**
     * Update folder and verify ownership
     */
    async updateByIdAndUser(
        folderId: string,
        userId: string,
        data: Partial<INoteFolder>
    ): Promise<INoteFolder | null> {
        return this.updateOne(
            {
                _id: folderId,
                userId: { $eq: userId }
            } as SafeFilter<INoteFolder>,
            { $set: data },
            { returnNew: true }
        );
    }

    /**
     * Delete folder and verify ownership
     */
    async deleteByIdAndUser(folderId: string, userId: string): Promise<boolean> {
        return this.deleteOne({
            _id: folderId,
            userId: { $eq: userId }
        } as SafeFilter<INoteFolder>);
    }

    /**
     * Check if a folder name already exists at the same level
     */
    async existsWithName(
        userId: string,
        name: string,
        parentId: string | null,
        excludeId?: string
    ): Promise<boolean> {
        const filter: any = {
            userId: { $eq: userId },
            name: { $eq: name }
        };

        if (parentId === null) {
            filter.parentId = { $eq: null };
        } else {
            filter.parentId = { $eq: new mongoose.Types.ObjectId(parentId) };
        }

        if (excludeId) {
            filter._id = { $ne: new mongoose.Types.ObjectId(excludeId) };
        }

        const folder = await this.findOne(filter as SafeFilter<INoteFolder>);
        return folder !== null;
    }

    /**
     * Get all descendant folder IDs (optimized with $graphLookup)
     */
    async getDescendantIds(userId: string, folderId: string): Promise<string[]> {
        interface AggregationResult {
            _id: mongoose.Types.ObjectId;
            descendantIds?: mongoose.Types.ObjectId[];
        }

        const results = await this.model.aggregate<AggregationResult>([
            {
                $match: {
                    _id: new mongoose.Types.ObjectId(folderId),
                    userId: new mongoose.Types.ObjectId(userId)
                }
            },
            {
                $graphLookup: {
                    from: 'notefolders',
                    startWith: '$_id',
                    connectFromField: '_id',
                    connectToField: 'parentId',
                    as: 'descendants',
                    maxDepth: 10 // Prevent infinite recursion safety valve
                }
            },
            {
                $project: {
                    descendantIds: '$descendants._id'
                }
            }
        ]);

        if (results.length === 0 || !results[0].descendantIds) {
            return [];
        }

        return results[0].descendantIds.map(id => id.toString());
    }
}
