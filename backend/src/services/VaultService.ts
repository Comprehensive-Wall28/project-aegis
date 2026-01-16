import { Request } from 'express';
import { Readable } from 'stream';
import { BaseService, ServiceError } from './base/BaseService';
import { FileMetadataRepository } from '../repositories/FileMetadataRepository';
import { IFileMetadata } from '../models/FileMetadata';
import Folder from '../models/Folder';
import SharedFolder from '../models/SharedFolder';
import {
    initiateUpload,
    appendChunk,
    finalizeUpload,
    getFileStream,
    deleteFile
} from './googleDriveService';
import logger from '../utils/logger';

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
    constructor() {
        super(new FileMetadataRepository());
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

            // Initiate Google Drive resumable upload session
            const uploadStreamId = await initiateUpload(data.originalFileName, data.fileSize, {
                ownerId: userId,
                encryptedSymmetricKey: data.encryptedSymmetricKey,
                encapsulatedKey: data.encapsulatedKey
            });

            // Create file metadata record
            const fileRecord = await this.repository.create({
                ownerId: userId as any,
                folderId: data.folderId || null,
                fileName: data.fileName,
                originalFileName: data.originalFileName,
                fileSize: data.fileSize,
                encryptedSymmetricKey: data.encryptedSymmetricKey,
                encapsulatedKey: data.encapsulatedKey,
                mimeType: data.mimeType,
                uploadStreamId,
                status: 'pending'
            } as any);

            logger.info(`Vault upload initiated: ${data.originalFileName} by User ${userId}`);

            await this.logAction(userId, 'FILE_UPLOAD', 'SUCCESS', req, {
                fileName: data.originalFileName,
                fileSize: data.fileSize,
                mimeType: data.mimeType,
                fileId: fileRecord._id.toString()
            });

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
        getChunkData: () => Promise<Buffer>
    ): Promise<ChunkUploadResult> {
        try {
            if (!fileId || !contentRange) {
                throw new ServiceError('Missing fileId or Content-Range', 400);
            }

            const fileRecord = await this.repository.findByIdAndStream(fileId, userId);
            if (!fileRecord || !fileRecord.uploadStreamId) {
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

            // Get chunk data
            const chunkBuffer = await getChunkData();

            // Update status to uploading if still pending
            if (fileRecord.status === 'pending') {
                await this.repository.updateUploadStatus(fileId, 'uploading');
            }

            // Append chunk to Google Drive upload session
            const { complete, receivedSize } = await appendChunk(
                fileRecord.uploadStreamId,
                chunkBuffer,
                rangeStart,
                rangeEnd,
                totalSize
            );

            if (complete) {
                // Finalize the upload
                const googleDriveFileId = await finalizeUpload(fileRecord.uploadStreamId);
                await this.repository.completeUpload(fileId, googleDriveFileId);

                logger.info(`Vault upload completed: ${fileId} -> Google Drive ${googleDriveFileId}`);
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

            // If not owner, check if file is in a shared folder
            if (!fileRecord) {
                const potentialFile = await this.repository.findById(fileId);
                if (potentialFile && potentialFile.folderId) {
                    const isShared = await SharedFolder.findOne({
                        folderId: potentialFile.folderId,
                        sharedWith: userId
                    });
                    if (isShared && isShared.permissions.includes('DOWNLOAD')) {
                        fileRecord = potentialFile;
                    }
                }
            }

            if (!fileRecord || !fileRecord.googleDriveFileId) {
                throw new ServiceError('File not found or not ready', 404);
            }

            const stream = await getFileStream(fileRecord.googleDriveFileId);
            logger.info(`Vault download started: ${fileRecord.originalFileName} (${fileId})`);

            return { stream, file: fileRecord };
        } catch (error) {
            if (error instanceof ServiceError) throw error;
            logger.error('Download error:', error);
            throw new ServiceError('Download failed', 500);
        }
    }

    /**
     * Get files for user in a folder (or root)
     */
    async getUserFiles(
        userId: string,
        folderId?: string | null
    ): Promise<IFileMetadata[]> {
        try {
            if (folderId && folderId !== 'null') {
                const folder = await Folder.findById(folderId);
                if (!folder) {
                    throw new ServiceError('Folder not found', 404);
                }

                const isOwner = folder.ownerId.toString() === userId;
                let hasAccess = isOwner;

                if (!hasAccess) {
                    // Check direct share
                    const directShare = await SharedFolder.findOne({ folderId, sharedWith: userId });
                    if (directShare) {
                        hasAccess = true;
                    } else {
                        // Check ancestors
                        let current = folder;
                        while (current.parentId) {
                            const ancestorShare = await SharedFolder.findOne({
                                folderId: current.parentId,
                                sharedWith: userId
                            });
                            if (ancestorShare) {
                                hasAccess = true;
                                break;
                            }
                            const parent = await Folder.findById(current.parentId);
                            if (!parent) break;
                            current = parent;
                        }
                    }
                }

                if (!hasAccess) {
                    throw new ServiceError('Access denied to this folder', 403);
                }

                // Fetch files owned by the folder's owner
                return await this.repository.findByFolderAndFolderOwner(
                    folderId,
                    folder.ownerId.toString()
                );
            }

            // Root level files
            return await this.repository.findByOwnerAndFolder(userId, null);
        } catch (error) {
            if (error instanceof ServiceError) throw error;
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

            logger.info(`Vault file deleted: ${fileRecord.fileName} (${fileId}) by User ${userId}`);

            await this.logAction(userId, 'FILE_DELETE', 'SUCCESS', req, {
                fileName: fileRecord.originalFileName,
                fileId
            });
        } catch (error) {
            if (error instanceof ServiceError) throw error;
            logger.error('Delete file error:', error);
            throw new ServiceError('Delete failed', 500);
        }
    }
}
