import { BaseRepository } from './base/BaseRepository';
import SharedFolder, { ISharedFolder } from '../models/SharedFolder';
import { SafeFilter } from './base/types';

/**
 * SharedFolderRepository handles SharedFolder database operations
 */
export class SharedFolderRepository extends BaseRepository<ISharedFolder> {
    constructor() {
        super(SharedFolder);
    }

    /**
     * Find shared folder by folderId and sharedWith user
     */
    async findByFolderAndUser(folderId: string, userId: string): Promise<ISharedFolder | null> {
        return this.findOne({
            folderId: { $eq: folderId },
            sharedWith: { $eq: userId }
        } as unknown as SafeFilter<ISharedFolder>);
    }

    /**
     * Find all folders shared with a user
     */
    async findSharedWithUser(userId: string): Promise<ISharedFolder[]> {
        return this.model.find({ sharedWith: userId })
            .populate('folderId')
            .populate('sharedBy', 'username email')
            .exec();
    }
}
