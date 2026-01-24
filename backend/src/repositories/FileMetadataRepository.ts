import { BaseRepository } from './base/BaseRepository';
import FileMetadata, { IFileMetadata } from '../models/FileMetadata';
import { QueryOptions, SafeFilter, BulkWriteOperation } from './base/types';
import { escapeRegex } from '../utils/regexUtils';

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
            ownerId: { $eq: ownerId }
        } as SafeFilter<IFileMetadata>);
    }

    /**
     * Find file by ID and upload stream ID
     */
    async findByIdAndStream(fileId: string, ownerId: string): Promise<IFileMetadata | null> {
        const file = await this.findOne({
            _id: fileId,
            ownerId: { $eq: ownerId }
        } as SafeFilter<IFileMetadata>);

        return file?.uploadStreamId ? file : null;
    }

    /**
     * Find files by owner in a specific folder (or root)
     */
    async findByOwnerAndFolder(
        ownerId: string,
        folderId: string | null,
        search?: string,
        options: QueryOptions = {}
    ): Promise<IFileMetadata[]> {
        const filter: any = {
            ownerId: { $eq: ownerId }
        };

        if (search) {
            filter.originalFileName = { $regex: escapeRegex(search), $options: 'i' };
            // Global search ignores folderId
        } else if (folderId) {
            filter.folderId = { $eq: folderId };
        } else {
            filter.folderId = null;
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
            folderId: { $eq: folderId },
            ownerId: { $eq: folderOwnerId }
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
        return this.updateById(fileId, { $set: { status } });
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
        });
    }

    /**
     * Delete file by ID and owner
     */
    async deleteByIdAndOwner(fileId: string, ownerId: string): Promise<boolean> {
        return this.deleteOne({
            _id: fileId,
            ownerId: { $eq: ownerId }
        } as SafeFilter<IFileMetadata>);
    }
    /**
     * Bulk move files with new encrypted keys
     */
    async bulkMoveFiles(
        updates: { fileId: string; encryptedKey: string; encapsulatedKey: string; folderId: string | null }[],
        ownerId: string
    ): Promise<number> {
        if (updates.length === 0) return 0;

        const operations: BulkWriteOperation<IFileMetadata>[] = updates.map(update => ({
            updateOne: {
                filter: { _id: update.fileId, ownerId: ownerId } as SafeFilter<IFileMetadata>,
                update: {
                    $set: {
                        encryptedSymmetricKey: update.encryptedKey,
                        encapsulatedKey: update.encapsulatedKey,
                        folderId: update.folderId
                    }
                }
            }
        }));

        const result = await this.bulkWrite(operations);
        return result.modifiedCount || 0;
    }

    /**
     * Find files by owner in a folder (paginated)
     */
    async findByOwnerAndFolderPaginated(
        ownerId: string,
        folderId: string | null,
        options: { limit: number; cursor?: string; search?: string }
    ): Promise<{ items: IFileMetadata[]; nextCursor: string | null }> {
        const filter: any = {
            ownerId: { $eq: ownerId }
        };

        if (options.search) {
            filter.originalFileName = { $regex: escapeRegex(options.search), $options: 'i' };
            // Global search ignores folderId
        } else if (folderId) {
            filter.folderId = { $eq: folderId };
        } else {
            filter.folderId = null;
        }

        return this.findPaginated(filter, {
            limit: Math.min(options.limit || 20, 100),
            cursor: options.cursor,
            sortField: 'createdAt',
            sortOrder: -1
        });
    }
}

