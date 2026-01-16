import { Readable } from 'stream';
import { BaseService, ServiceError } from './base/BaseService';
import { SharedLinkRepository } from '../repositories/SharedLinkRepository';
import { FileMetadataRepository } from '../repositories/FileMetadataRepository';
import { FolderRepository } from '../repositories/FolderRepository';
import { UserRepository } from '../repositories/UserRepository';
import { getFileStream } from './googleDriveService';
import { ISharedLink } from '../models/SharedLink';
import logger from '../utils/logger';

export interface LinkMetadata {
    metadata: {
        type: 'file' | 'folder';
        name: string;
        size?: number;
        mimeType?: string;
        createdAt: Date;
        id: string;
        ownerName: string;
    };
    encryptedKey: string;
    isPublic: boolean;
    requiresAuth: boolean;
}

export interface FileDownloadResponse {
    stream: Readable;
    mimeType: string;
    fileName: string;
    fileSize: number;
}

/**
 * PublicShareService handles public link access logic
 */
export class PublicShareService extends BaseService<ISharedLink, SharedLinkRepository> {
    private fileRepo: FileMetadataRepository;
    private folderRepo: FolderRepository;
    private userRepo: UserRepository;

    constructor() {
        super(new SharedLinkRepository());
        this.fileRepo = new FileMetadataRepository();
        this.folderRepo = new FolderRepository();
        this.userRepo = new UserRepository();
    }

    /**
     * Get metadata for a shared link
     */
    async getLinkMetadata(token: string): Promise<LinkMetadata> {
        try {
            if (!token) {
                throw new ServiceError('Token is required', 400);
            }

            const link = await this.repository.findByToken(token);
            if (!link) {
                throw new ServiceError('Link not found or expired', 404);
            }

            await this.repository.incrementViewCount(token);

            let ownerName = 'Aegis User';
            let metadata: any = {};

            if (link.resourceType === 'file') {
                const file = await this.fileRepo.findById(link.resourceId.toString());
                if (!file) {
                    throw new ServiceError('File not found', 404);
                }

                if (file.ownerId) {
                    const owner = await this.userRepo.findById(file.ownerId.toString());
                    if (owner) ownerName = owner.username;
                }

                metadata = {
                    type: 'file',
                    name: file.originalFileName,
                    size: file.fileSize,
                    mimeType: file.mimeType,
                    createdAt: file.createdAt,
                    id: file._id.toString(),
                    ownerName
                };
            } else {
                const folder = await this.folderRepo.findById(link.resourceId.toString());
                if (!folder) {
                    throw new ServiceError('Folder not found', 404);
                }

                if (folder.ownerId) {
                    const owner = await this.userRepo.findById(folder.ownerId.toString());
                    if (owner) ownerName = owner.username;
                }

                metadata = {
                    type: 'folder',
                    name: folder.name,
                    createdAt: folder.createdAt,
                    id: folder._id.toString(),
                    ownerName
                };
            }

            return {
                metadata,
                encryptedKey: link.encryptedKey,
                isPublic: link.isPublic,
                requiresAuth: !link.isPublic
            };

        } catch (error) {
            if (error instanceof ServiceError) throw error;
            logger.error('Get link metadata error:', error);
            throw new ServiceError('Failed to fetch link metadata', 500);
        }
    }

    /**
     * Download file via shared link
     */
    async downloadSharedFile(token: string): Promise<FileDownloadResponse> {
        try {
            if (!token) {
                throw new ServiceError('Token is required', 400);
            }

            const link = await this.repository.findByToken(token);
            if (!link) {
                throw new ServiceError('Link not found', 404);
            }

            if (link.resourceType !== 'file') {
                throw new ServiceError('Not a file link', 400);
            }

            const fileRecord = await this.fileRepo.findById(link.resourceId.toString());
            if (!fileRecord || !fileRecord.googleDriveFileId) {
                throw new ServiceError('File not found', 404);
            }

            // TODO: strict auth check for restricted links if needed

            const stream = await getFileStream(fileRecord.googleDriveFileId);

            return {
                stream,
                mimeType: fileRecord.mimeType || 'application/octet-stream',
                fileName: fileRecord.originalFileName,
                fileSize: fileRecord.fileSize
            };

        } catch (error) {
            if (error instanceof ServiceError) throw error;
            logger.error('Shared file download error:', error);
            throw new ServiceError('Download failed', 500);
        }
    }
}
