import { Request } from 'express';
import { Readable } from 'stream';
import mongoose from 'mongoose';
import { BaseService, ServiceError } from './base/BaseService';
import { FileMetadataRepository } from '../repositories/FileMetadataRepository';
import { UserRepository } from '../repositories/UserRepository';
import { FolderRepository } from '../repositories/FolderRepository';
import { IFileMetadata } from '../models/FileMetadata';
import Folder from '../models/Folder';
import {
    initiateUpload,
    appendChunk,
    finalizeUpload,
    getFileStream,
    deleteFile
} from './googleDriveService';
import logger from '../utils/logger';
import { withCache, CacheInvalidator } from '../utils/cacheUtils';
import CacheKeyBuilder from './cache/CacheKeyBuilder';

/**
 * DTO for initiating file upload
 */
export interface UploadInitDTO {
    fileName: string;
    originalFileName: string;
    fileSize: number;
    encryptedSymmetricKey: string;
    encapsulatedKey: string;
    mimeType: string;
    folderId?: string | null;
}

/**
 * DTO for chunk upload result
 */
export interface ChunkUploadResult {
    complete: boolean;
    receivedSize?: number;
    googleDriveFileId?: string;
}

/**
 * VaultService handles file storage business logic
 */
export class VaultService extends BaseService<IFileMetadata, FileMetadataRepository> {
    private userRepository: UserRepository;
    private folderRepository: FolderRepository;
    private readonly MAX_STORAGE = 5 * 1024 * 1024 * 1024; // 5GB

    constructor() {
        super(new FileMetadataRepository());
        this.userRepository = new UserRepository();
        this.folderRepository = new FolderRepository();
    }

    /**
     * Initialize a file upload session
     */
    async initUpload(
        userId: string,
        data: UploadInitDTO,
        req: Request
    ): Promise<{ fileId: string }> {
        try {
            // Validate required fields
            this.validateRequired({
                fileName: data.fileName,
                originalFileName: data.originalFileName,
                fileSize: data.fileSize,
                encryptedSymmetricKey: data.encryptedSymmetricKey,
                encapsulatedKey: data.encapsulatedKey,
                mimeType: data.mimeType
            }, [
                'fileName',
                'originalFileName',
                'fileSize',
                'encryptedSymmetricKey',
                'encapsulatedKey',
                'mimeType'
            ]);

            // Check user storage limit
            const user = await this.userRepository.findById(userId);
            if (!user) {
                throw new ServiceError('User not found', 404);
            }

            if (user.totalStorageUsed + data.fileSize > this.MAX_STORAGE) {
                throw new ServiceError('Storage limit exceeded. Delete some files.', 403);
            }

            // Initiate Google Drive resumable upload session
            const { sessionId, sessionUrl } = await initiateUpload(data.originalFileName, data.fileSize, {
                ownerId: userId,
                encryptedSymmetricKey: data.encryptedSymmetricKey,
                encapsulatedKey: data.encapsulatedKey
            });

            // Create file metadata record
            const fileRecord = await this.repository.create({
                ownerId: new mongoose.Types.ObjectId(userId),
                folderId: data.folderId ? new mongoose.Types.ObjectId(data.folderId) : null,
                fileName: data.fileName,
                originalFileName: data.originalFileName,
                fileSize: data.fileSize,
                encryptedSymmetricKey: data.encryptedSymmetricKey,
                encapsulatedKey: data.encapsulatedKey,
                mimeType: data.mimeType,
                uploadStreamId: sessionId,
                uploadSessionUrl: sessionUrl,
                uploadOffset: 0,
                status: 'pending'
            } as Partial<IFileMetadata>);


            await this.logAction(userId, 'FILE_UPLOAD', 'SUCCESS', req, {
                fileName: data.originalFileName,
                fileSize: data.fileSize,
                mimeType: data.mimeType,
                fileId: fileRecord._id.toString()
            });

            // Invalidate file list caches since a new file is being added
            CacheInvalidator.userFiles(userId);

            return { fileId: fileRecord._id.toString() };
        } catch (error) {
            if (error instanceof ServiceError) throw error;
            logger.error('Upload init error:', error);
            throw new ServiceError('Failed to initialize upload', 500);
        }
    }

    /**
     * Process a chunk upload
     */
    async uploadChunk(
        userId: string,
        fileId: string,
        contentRange: string,
        chunk: Readable | Buffer,
        chunkLength: number
    ): Promise<ChunkUploadResult> {
        try {
            if (!fileId || !contentRange) {
                throw new ServiceError('Missing fileId or Content-Range', 400);
            }

            const fileRecord = await this.repository.findByIdAndStream(fileId, userId);
            if (!fileRecord || !fileRecord.uploadSessionUrl) {
                throw new ServiceError('File not found or session invalid', 404);
            }

            // Parse Content-Range: "bytes START-END/TOTAL"
            const rangeMatch = contentRange.match(/bytes (\d+)-(\d+)\/(\d+)/);
            if (!rangeMatch) {
                throw new ServiceError('Invalid Content-Range header', 400);
            }

            const rangeStart = parseInt(rangeMatch[1], 10);
            const rangeEnd = parseInt(rangeMatch[2], 10);
            const totalSize = parseInt(rangeMatch[3], 10);

            // Update status to uploading if still pending
            if (fileRecord.status === 'pending') {
                await this.repository.updateUploadStatus(fileId, 'uploading');
            }

            // Append chunk to Google Drive upload session
            const { complete, receivedSize } = await appendChunk(
                fileRecord.uploadSessionUrl,
                chunk,
                chunkLength,
                rangeStart,
                rangeEnd,
                totalSize
            );

            // Update offset in DB
            if (receivedSize > (fileRecord.uploadOffset || 0)) {
                fileRecord.uploadOffset = receivedSize;
                await fileRecord.save();
            }

            if (complete) {
                // Finalize the upload
                const googleDriveFileId = await finalizeUpload(fileRecord.uploadSessionUrl, totalSize);
                await this.repository.completeUpload(fileId, googleDriveFileId);

                // Update user storage usage
                await this.userRepository.updateById(userId, {
                    $inc: { totalStorageUsed: fileRecord.fileSize }
                });

                // Invalidate storage stats and file list caches
                CacheInvalidator.userFiles(userId);

                return { complete: true, googleDriveFileId };
            }

            return { complete: false, receivedSize };
        } catch (error) {
            if (error instanceof ServiceError) throw error;
            logger.error('Upload chunk error:', error);
            throw new ServiceError('Failed to process chunk', 500);
        }
    }

    /**
     * Get file stream for download
     */
    async getDownloadStream(
        userId: string,
        fileId: string
    ): Promise<{ stream: Readable; file: IFileMetadata }> {
        try {
            let fileRecord = await this.repository.findByIdAndOwner(fileId, userId);

            if (!fileRecord || !fileRecord.googleDriveFileId) {
                throw new ServiceError('File not found or access denied', 404);
            }

            const stream = await getFileStream(fileRecord.googleDriveFileId);

            return { stream, file: fileRecord };
        } catch (error) {
            if (error instanceof ServiceError) throw error;
            logger.error('Download error:', error);
            throw new ServiceError('Download failed', 500);
        }
    }

    /**
     * Get a single file by ID (cached)
     */
    public async getFile(userId: string, fileId: string): Promise<IFileMetadata> {
        const cacheKey = CacheKeyBuilder.userFile(userId, fileId);
        
        return withCache(
            { key: cacheKey, ttl: 60000 }, // 1 minute TTL for single items
            async () => {
                const file = await this.repository.findByIdAndOwner(fileId, userId);
                if (!file) {
                    throw new ServiceError('File not found', 404);
                }
                return file;
            }
        );
    }

    /**
     * Get files for user in a folder (or root)
     */
    async getUserFiles(
        userId: string,
        folderId?: string | null,
        search?: string
    ): Promise<IFileMetadata[]> {
        try {
            if (!search && folderId && folderId !== 'null') {
                // Validate folderId before usage to prevent verbose CastErrors
                if (!mongoose.isValidObjectId(folderId)) {
                    logger.warn(`Invalid folderId format in getUserFiles: ${folderId}`);
                    // Return empty list or throw 400 - here throwing 400 is safer
                    throw new ServiceError('Invalid folder ID format', 400);
                }

                const folder = await Folder.findById(folderId);
                if (!folder) {
                    throw new ServiceError('Folder not found', 404);
                }

                const isOwner = folder.ownerId.toString() === userId;
                if (!isOwner) {
                    throw new ServiceError('Access denied to this folder', 403);
                }

                // Fetch files owned by the folder's owner OR the current user (if they added files to shared folder)
                // Use a direct repository find with $or condition instead of restrictive helper
                return await this.repository.findMany({
                    folderId: { $eq: folderId },
                    $or: [
                        { ownerId: { $eq: folder.ownerId.toString() } }, // Owned by folder owner
                        { ownerId: { $eq: userId } }                     // Owned by current user (me)
                    ]
                } as any, {
                    sort: { createdAt: -1 }
                });
            }

            // Root level files or Global Search
            return await this.repository.findByOwnerAndFolder(userId, null, search);
        } catch (error: unknown) {
            if (error instanceof ServiceError) throw error;

            // Check for CastError explicitly if initial check somehow failed or for other fields
            if (error && typeof error === 'object' && 'name' in error && error.name === 'CastError') {
                logger.warn(`CastError in getUserFiles: ${(error as any).message}`);
                throw new ServiceError('Invalid ID format', 400);
            }

            logger.error('Get files error:', error);
            throw new ServiceError('Failed to get files', 500);
        }
    }

    /**
     * Delete a file
     */
    async deleteFile(
        userId: string,
        fileId: string,
        req: Request
    ): Promise<void> {
        try {
            const fileRecord = await this.repository.findByIdAndOwner(fileId, userId);

            if (!fileRecord) {
                throw new ServiceError('File not found', 404);
            }

            // Delete from Google Drive if file was uploaded
            if (fileRecord.googleDriveFileId) {
                await deleteFile(fileRecord.googleDriveFileId);
            }

            // Delete metadata record
            await this.repository.deleteByIdAndOwner(fileId, userId);

            // Update user storage usage (decrement)
            if (fileRecord.status === 'completed') {
                await this.userRepository.updateById(userId, {
                    $inc: { totalStorageUsed: -fileRecord.fileSize }
                });
            }


            await this.logAction(userId, 'FILE_DELETE', 'SUCCESS', req, {
                fileName: fileRecord.originalFileName,
                fileId
            });

            // Invalidate all file-related caches for this user
            CacheInvalidator.userFiles(userId);
        } catch (error) {
            if (error instanceof ServiceError) throw error;
            logger.error('Delete file error:', error);
            throw new ServiceError('Delete failed', 500);
        }
    }

    /**
     * Get user storage stats (cached)
     */
    async getStorageStats(userId: string): Promise<{ totalStorageUsed: number; maxStorage: number }> {
        const cacheKey = CacheKeyBuilder.userStorageStats(userId);
        
        return withCache(
            { key: cacheKey, ttl: 60000 }, // 1 minute for storage stats
            async () => {
                const user = await this.userRepository.findById(userId);
                if (!user) {
                    throw new ServiceError('User not found', 404);
                }

                return {
                    totalStorageUsed: user.totalStorageUsed || 0,
                    maxStorage: this.MAX_STORAGE
                };
            }
        );
    }

    /**
     * Get files for user in a folder (paginated, cached)
     */
    async getUserFilesPaginated(
        userId: string,
        folderId: string | null,
        options: { limit: number; cursor?: string; search?: string }
    ): Promise<{ items: IFileMetadata[]; nextCursor: string | null }> {
        try {
            if (folderId && folderId !== 'null') {
                if (!mongoose.isValidObjectId(folderId)) {
                    logger.warn(`Invalid folderId format in getUserFilesPaginated: ${folderId}`);
                    throw new ServiceError('Invalid folder ID format', 400);
                }
            }

            const cacheKey = CacheKeyBuilder.userFiles(userId, folderId, options.search) + 
                `:cursor_${options.cursor || 'first'}:limit_${Math.min(options.limit || 20, 100)}`;
            
            return await withCache(
                { key: cacheKey, ttl: 300000 }, // 5 minutes for paginated lists
                async () => {
                    return await this.repository.findByOwnerAndFolderPaginated(
                        userId,
                        folderId,
                        {
                            limit: Math.min(options.limit || 20, 100),
                            cursor: options.cursor,
                            search: options.search
                        }
                    );
                }
            );
        } catch (error: any) {
            if (error instanceof ServiceError) throw error;

            if (error.name === 'CastError' || error.kind === 'ObjectId') {
                logger.warn(`CastError in getUserFilesPaginated: ${error.message}`);
                throw new ServiceError('Invalid ID format', 400);
            }

            logger.error('Get files paginated error:', error);
            throw new ServiceError('Failed to get files', 500);
        }
    }
}

