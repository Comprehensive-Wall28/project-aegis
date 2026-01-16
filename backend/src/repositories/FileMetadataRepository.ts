import { BaseRepository } from './base/BaseRepository';
import FileMetadata, { IFileMetadata } from '../models/FileMetadata';
import { QueryOptions, SafeFilter } from './base/types';

/**
 * FileMetadataRepository handles all file metadata database operations
 */
export class FileMetadataRepository extends BaseRepository<IFileMetadata> {
    constructor() {
        super(FileMetadata);
    }

    /**
     * Find file by ID and owner
     */
    async findByIdAndOwner(fileId: string, ownerId: string): Promise<IFileMetadata | null> {
        return this.findOne({
            _id: fileId,
            ownerId: { $eq: ownerId as any }
        } as SafeFilter<IFileMetadata>);
    }

    /**
     * Find file by ID and upload stream ID
     */
    async findByIdAndStream(fileId: string, ownerId: string): Promise<IFileMetadata | null> {
        const file = await this.findOne({
            _id: fileId,
            ownerId: { $eq: ownerId as any }
        } as SafeFilter<IFileMetadata>);

        return file?.uploadStreamId ? file : null;
    }

    /**
     * Find files by owner in a specific folder (or root)
     */
    async findByOwnerAndFolder(
        ownerId: string,
        folderId: string | null,
        options: QueryOptions = {}
    ): Promise<IFileMetadata[]> {
        const filter: SafeFilter<IFileMetadata> = {
            ownerId: { $eq: ownerId as any }
        };

        if (folderId) {
            (filter as any).folderId = { $eq: folderId };
        } else {
            (filter as any).folderId = null;
        }

        return this.findMany(filter, {
            sort: { createdAt: -1 },
            ...options
        });
    }

    /**
     * Find files in a folder (by folder owner for shared access)
     */
    async findByFolderAndFolderOwner(
        folderId: string,
        folderOwnerId: string,
        options: QueryOptions = {}
    ): Promise<IFileMetadata[]> {
        return this.findMany({
            folderId: { $eq: folderId as any },
            ownerId: { $eq: folderOwnerId as any }
        } as SafeFilter<IFileMetadata>, {
            sort: { createdAt: -1 },
            ...options
        });
    }

    /**
     * Update file upload status
     */
    async updateUploadStatus(
        fileId: string,
        status: 'pending' | 'uploading' | 'completed' | 'failed'
    ): Promise<IFileMetadata | null> {
        return this.updateById(fileId, { $set: { status } } as any);
    }

    /**
     * Complete upload - set Google Drive file ID and clear upload session
     */
    async completeUpload(
        fileId: string,
        googleDriveFileId: string
    ): Promise<IFileMetadata | null> {
        return this.updateById(fileId, {
            $set: {
                googleDriveFileId,
                status: 'completed'
            },
            $unset: { uploadStreamId: 1 }
        } as any);
    }

    /**
     * Delete file by ID and owner
     */
    async deleteByIdAndOwner(fileId: string, ownerId: string): Promise<boolean> {
        return this.deleteOne({
            _id: fileId,
            ownerId: { $eq: ownerId as any }
        } as SafeFilter<IFileMetadata>);
    }
}
