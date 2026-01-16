import { BaseRepository } from './base/BaseRepository';
import SharedFile, { ISharedFile } from '../models/SharedFile';
import { SafeFilter } from './base/types';

/**
 * SharedFileRepository handles SharedFile database operations
 */
export class SharedFileRepository extends BaseRepository<ISharedFile> {
    constructor() {
        super(SharedFile);
    }

    /**
     * Find shared file by fileId and sharedWith user
     */
    async findByFileAndUser(fileId: string, userId: string): Promise<ISharedFile | null> {
        return this.findOne({
            fileId: { $eq: fileId },
            sharedWith: { $eq: userId }
        } as unknown as SafeFilter<ISharedFile>);
    }
}
