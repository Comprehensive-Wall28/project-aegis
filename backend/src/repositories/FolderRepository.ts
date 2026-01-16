import { BaseRepository } from './base/BaseRepository';
import Folder, { IFolder } from '../models/Folder';
import { QueryOptions, SafeFilter } from './base/types';

/**
 * FolderRepository handles all folder database operations
 */
export class FolderRepository extends BaseRepository<IFolder> {
    constructor() {
        super(Folder);
    }

    /**
     * Find folders by owner and parent
     */
    async findByOwnerAndParent(
        ownerId: string,
        parentId: string | null,
        options: QueryOptions = {}
    ): Promise<IFolder[]> {
        const filter: SafeFilter<IFolder> = {
            ownerId: { $eq: ownerId as any }
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
    ): Promise<IFolder[]> {
        return this.findMany({
            parentId: { $eq: parentId as any },
            ownerId: { $eq: ownerId as any }
        } as SafeFilter<IFolder>, {
            sort: { name: 1 },
            ...options
        });
    }

    /**
     * Find folder by ID and owner
     */
    async findByIdAndOwner(folderId: string, ownerId: string): Promise<IFolder | null> {
        return this.findOne({
            _id: folderId,
            ownerId: { $eq: ownerId as any }
        } as SafeFilter<IFolder>);
    }

    /**
     * Update folder by ID and owner
     */
    async updateByIdAndOwner(
        folderId: string,
        ownerId: string,
        data: Partial<IFolder>
    ): Promise<IFolder | null> {
        return this.updateOne(
            {
                _id: folderId,
                ownerId: { $eq: ownerId as any }
            } as SafeFilter<IFolder>,
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
        } as SafeFilter<IFolder>);
    }

    /**
     * Count subfolders
     */
    async countSubfolders(parentId: string, ownerId: string): Promise<number> {
        return this.count({
            parentId: { $eq: parentId as any },
            ownerId: { $eq: ownerId as any }
        } as SafeFilter<IFolder>);
    }
}
