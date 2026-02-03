import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { BaseRepository } from '../../common/database/base.repository';
import { Folder, FolderDocument } from './folder.schema';
import { QueryOptions, SafeFilter } from '../../common/database/types';

@Injectable()
export class FolderRepository extends BaseRepository<FolderDocument> {
    constructor(@InjectModel(Folder.name) private folderModel: Model<FolderDocument>) {
        super(folderModel);
    }

    /**
     * Find folders by owner and parent
     */
    async findByOwnerAndParent(
        ownerId: string,
        parentId: string | null,
        options: QueryOptions = {}
    ): Promise<FolderDocument[]> {
        const filter: SafeFilter<FolderDocument> = {
            ownerId: { $eq: ownerId } as any
        };

        if (parentId === null) {
            (filter as any).parentId = null;
        } else {
            (filter as any).parentId = { $eq: parentId };
        }

        return this.findMany(filter, {
            sort: { name: 1 },
            ...options
        });
    }

    /**
     * Find subfolders by parent and folder owner (for shared folder navigation)
     */
    async findSubfolders(
        parentId: string,
        ownerId: string,
        options: QueryOptions = {}
    ): Promise<FolderDocument[]> {
        return this.findMany({
            parentId: { $eq: parentId as any },
            ownerId: { $eq: ownerId as any }
        } as SafeFilter<FolderDocument>, {
            sort: { name: 1 },
            ...options
        });
    }

    /**
     * Find folder by ID and owner
     */
    async findByIdAndOwner(folderId: string, ownerId: string): Promise<FolderDocument | null> {
        return this.findOne({
            _id: folderId,
            ownerId: { $eq: ownerId as any }
        } as SafeFilter<FolderDocument>);
    }

    /**
     * Update folder by ID and owner
     */
    async updateByIdAndOwner(
        folderId: string,
        ownerId: string,
        data: Partial<FolderDocument>
    ): Promise<FolderDocument | null> {
        return this.updateOne(
            {
                _id: folderId,
                ownerId: { $eq: ownerId as any }
            } as SafeFilter<FolderDocument>,
            { $set: data },
            { returnNew: true }
        );
    }

    /**
     * Delete folder by ID and owner
     */
    async deleteByIdAndOwner(folderId: string, ownerId: string): Promise<boolean> {
        return this.deleteOne({
            _id: folderId,
            ownerId: { $eq: ownerId as any }
        } as SafeFilter<FolderDocument>);
    }

    /**
     * Count subfolders
     */
    async countSubfolders(parentId: string, ownerId: string): Promise<number> {
        return this.count({
            parentId: { $eq: parentId as any },
            ownerId: { $eq: ownerId as any }
        } as SafeFilter<FolderDocument>);
    }

    /**
     * Get all ancestors of a folder (for permission checks)
     */
    async getAncestors(folderId: string): Promise<FolderDocument[]> {
        interface AggregationResult {
            _id: Types.ObjectId;
            ancestors: FolderDocument[];
        }

        const results = await this.model.aggregate<AggregationResult>([
            {
                $match: {
                    _id: new Types.ObjectId(folderId)
                }
            },
            {
                $graphLookup: {
                    from: 'folders',
                    startWith: '$parentId',
                    connectFromField: 'parentId',
                    connectToField: '_id',
                    as: 'ancestors',
                    maxDepth: 10
                }
            }
        ]);

        if (results.length === 0 || !results[0].ancestors) {
            return [];
        }

        return results[0].ancestors;
    }
}
