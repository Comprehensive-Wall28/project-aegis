import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { BaseRepository } from '../../../common/repositories/base.repository';
import { Folder, FolderDocument } from '../schemas/folder.schema';
import { SafeFilter, QueryOptions } from '../../../common/repositories/types';

@Injectable()
export class FolderRepository extends BaseRepository<FolderDocument> {
    constructor(
        @InjectModel(Folder.name, 'primary')
        readonly folderModel: Model<FolderDocument>,
    ) {
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
            ownerId: new Types.ObjectId(ownerId) as any
        };

        if (parentId === null || parentId === 'null') {
            (filter as any).parentId = null;
        } else {
            (filter as any).parentId = new Types.ObjectId(parentId);
        }

        return this.findMany(filter, {
            sort: { name: 1 },
            ...options
        });
    }

    /**
     * Find subfolders by parent and folder owner
     */
    async findSubfolders(
        parentId: string,
        ownerId: string,
        options: QueryOptions = {}
    ): Promise<FolderDocument[]> {
        return this.findMany({
            parentId: new Types.ObjectId(parentId) as any,
            ownerId: new Types.ObjectId(ownerId) as any
        } as SafeFilter<FolderDocument>, {
            sort: { name: 1 },
            ...options
        });
    }

    /**
     * Find folder by ID and owner
     */
    async findByIdAndOwner(folderId: string, ownerId: string): Promise<FolderDocument | null> {
        const folder = await this.findById(folderId);
        if (!folder || folder.ownerId.toString() !== ownerId) {
            return null;
        }
        return folder;
    }

    /**
     * Get all ancestors of a folder
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
