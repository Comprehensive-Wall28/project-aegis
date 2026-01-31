import { Injectable, NotFoundException, ForbiddenException, BadRequestException, Logger, Inject, forwardRef } from '@nestjs/common';
import { Types } from 'mongoose';
import { VaultFile, VaultFileDocument, StorageProvider, FileStatus } from './schemas/vault-file.schema';
import { UploadInitDto } from './dto/upload-init.dto';
import { GridFsService } from './gridfs.service';
import { GoogleDriveService } from './google-drive.service';
import { UsersService } from '../users/users.service';
import { FoldersService } from '../folders/folders.service';
import { VaultRepository } from './vault.repository';
import { Readable } from 'stream';
import { BaseService, AuditAction, AuditStatus } from '../../common/services/base.service';
import { FastifyRequest } from 'fastify';

@Injectable()
export class VaultService extends BaseService<VaultFileDocument, VaultRepository> {
    private readonly MAX_STORAGE = 5 * 1024 * 1024 * 1024; // 5GB

    constructor(
        private readonly vaultRepository: VaultRepository,
        private readonly gridFsService: GridFsService,
        private readonly googleDriveService: GoogleDriveService,
        private readonly usersService: UsersService,
        @Inject(forwardRef(() => FoldersService)) private readonly foldersService: FoldersService,
    ) {
        super(vaultRepository);
    }

    /**
     * Initialize file upload
     */
    async initiateUpload(
        userId: string,
        data: UploadInitDto,
        req: FastifyRequest | Record<string, any>
    ): Promise<{ fileId: string }> {
        // Check user storage limit
        const user = await this.usersService.findById(userId);
        if (!user) {
            throw new NotFoundException('User not found');
        }

        if (user.totalStorageUsed + data.fileSize > this.MAX_STORAGE) {
            throw new ForbiddenException('Storage limit exceeded. Delete some files.');
        }

        // Validate folder access if provided
        if (data.folderId) {
            const hasAccess = await this.foldersService.checkAccess(userId, data.folderId);
            if (!hasAccess) {
                throw new ForbiddenException('Access to folder denied');
            }
        }

        // Determine storage provider
        let provider = StorageProvider.GRIDFS;
        if (data.storageProvider) {
            provider = data.storageProvider as StorageProvider;
        } else if (data.fileSize > 50 * 1024 * 1024) { // Default to Drive for files > 50MB
            provider = StorageProvider.GOOGLE_DRIVE;
        }

        let uploadStreamId: string | undefined;

        // Initialize provider session
        if (provider === StorageProvider.GOOGLE_DRIVE) {
            uploadStreamId = await this.googleDriveService.initiateUpload(
                data.originalFileName,
                data.fileSize,
                { ownerId: userId }
            );
        } else {
            // For GridFS, we create a stream ID to track the session in our service layer
            uploadStreamId = new Types.ObjectId().toString();
        }

        // Create metadata record
        const file = await this.vaultRepository.create({
            ownerId: new Types.ObjectId(userId),
            folderId: data.folderId ? new Types.ObjectId(data.folderId) : null,
            fileName: data.fileName,
            originalFileName: data.originalFileName,
            fileSize: data.fileSize,
            mimeType: data.mimeType,
            encryptedSymmetricKey: data.encryptedSymmetricKey,
            encapsulatedKey: data.encapsulatedKey,
            storageProvider: provider,
            uploadStreamId,
            status: FileStatus.PENDING
        } as any);

        this.logAction(userId, AuditAction.FILE_UPLOAD, AuditStatus.SUCCESS, req, {
            fileName: data.originalFileName,
            fileSize: data.fileSize,
            mimeType: data.mimeType,
            fileId: file._id.toString()
        });

        return { fileId: file._id.toString() };
    }

    /**
     * Process upload chunk
     */
    async uploadChunk(
        userId: string,
        fileId: string,
        chunk: Buffer | Readable,
        chunkLength: number,
        rangeStart: number,
        rangeEnd: number,
        totalSize: number
    ): Promise<{ complete: boolean; receivedSize: number; googleDriveFileId?: string }> {
        const file = await this.vaultRepository.findByIdAndStream(fileId, userId);
        if (!file || !file.uploadStreamId) {
            throw new NotFoundException('File upload session not found');
        }

        if (file.status === FileStatus.PENDING) {
            await this.vaultRepository.updateUploadStatus(fileId, FileStatus.UPLOADING);
        }

        if (file.storageProvider === StorageProvider.GOOGLE_DRIVE) {
            const result = await this.googleDriveService.appendChunk(
                file.uploadStreamId,
                chunk,
                chunkLength,
                rangeStart,
                rangeEnd,
                totalSize
            );

            if (result.complete) {
                const driveFileId = await this.googleDriveService.finalizeUpload(file.uploadStreamId);
                await this.vaultRepository.completeUpload(fileId, driveFileId);

                // Update usage
                await this.usersService.updateStorageUsage(userId, file.fileSize);
                return { ...result, googleDriveFileId: driveFileId };
            }

            return result;
        } else {
            // Note: Parallel to legacy, we throw if someone tries to chunk-upload to GridFS without implementation
            throw new BadRequestException('Chunked upload not supported for GridFS in this version. Use standard multipart upload.');
        }
    }

    /**
     * Complete GridFS upload (called from controller after multipart flow)
     */
    async completeGridFsUpload(userId: string, fileId: string, gridFsId: Types.ObjectId) {
        const file = await this.vaultRepository.findOne({ _id: fileId, ownerId: userId } as any);
        if (!file) throw new NotFoundException('File metadata not found');

        file.gridFsId = gridFsId;
        file.status = FileStatus.COMPLETED;
        await file.save();

        await this.usersService.updateStorageUsage(userId, file.fileSize);
    }

    /**
     * Get download stream
     */
    async getDownloadStream(userId: string, fileId: string): Promise<{ stream: Readable; mimeType: string; fileName: string }> {
        let file = await this.vaultRepository.findByIdAndOwner(fileId, userId);

        // If not owner, check if file is in a shared folder
        if (!file) {
            const potentialFile = await this.vaultRepository.findById(fileId);
            if (potentialFile && potentialFile.folderId) {
                const hasAccess = await this.foldersService.checkAccess(userId, potentialFile.folderId.toString());
                if (hasAccess) {
                    file = potentialFile;
                }
            }
        }

        if (!file) {
            throw new NotFoundException('File not found');
        }

        let stream: Readable;

        if (file.storageProvider === StorageProvider.GOOGLE_DRIVE) {
            if (!file.googleDriveFileId) throw new NotFoundException('File not ready');
            stream = await this.googleDriveService.getFileStream(file.googleDriveFileId);
        } else {
            if (!file.gridFsId) throw new NotFoundException('File not ready');
            stream = this.gridFsService.getFileStream(file.gridFsId);
        }

        return {
            stream,
            mimeType: file.mimeType,
            fileName: file.originalFileName
        };
    }

    /**
     * Delete file
     */
    async deleteFile(userId: string, fileId: string, req: FastifyRequest | Record<string, any>): Promise<void> {
        const file = await this.vaultRepository.findByIdAndOwner(fileId, userId);
        if (!file) {
            throw new NotFoundException('File not found');
        }

        if (file.storageProvider === StorageProvider.GOOGLE_DRIVE && file.googleDriveFileId) {
            try {
                await this.googleDriveService.deleteFile(file.googleDriveFileId);
            } catch (e: any) {
                this.logger.warn(`Failed to delete Drive file ${file.googleDriveFileId}: ${e.message}`);
            }
        } else if (file.gridFsId) {
            try {
                await this.gridFsService.deleteFile(file.gridFsId);
            } catch (e: any) {
                this.logger.warn(`Failed to delete GridFS file ${file.gridFsId}: ${e.message}`);
            }
        }

        const fileSize = file.fileSize;
        const fileName = file.originalFileName;
        const status = file.status;

        await this.vaultRepository.deleteByIdAndOwner(fileId, userId);

        if (status === FileStatus.COMPLETED) {
            await this.usersService.updateStorageUsage(userId, -fileSize);
        }

        this.logAction(userId, AuditAction.FILE_DELETE, AuditStatus.SUCCESS, req, {
            fileName,
            fileId
        });
    }

    /**
     * List files
     */
    async listFiles(userId: string, folderId?: string, search?: string): Promise<{ items: VaultFile[]; nextCursor: string | null }> {
        const result = await this.vaultRepository.findByOwnerAndFolderPaginated(userId, folderId || null, {
            limit: 100,
            search
        });

        return {
            items: result.items,
            nextCursor: result.nextCursor
        };
    }

    /**
     * Get a single file by ID
     */
    async getFile(userId: string, fileId: string): Promise<VaultFileDocument> {
        const file = await this.vaultRepository.findByIdAndOwner(fileId, userId);
        if (!file) {
            throw new NotFoundException('File not found');
        }
        return file;
    }

    async countFiles(userId: string, folderId: string): Promise<number> {
        return this.vaultRepository.count({ ownerId: new Types.ObjectId(userId), folderId: new Types.ObjectId(folderId) } as any);
    }

    async getStorageStats(userId: string): Promise<{ totalStorageUsed: number; maxStorage: number }> {
        const user = await this.usersService.findById(userId);
        if (!user) throw new NotFoundException('User not found');

        return {
            totalStorageUsed: user.totalStorageUsed || 0,
            maxStorage: this.MAX_STORAGE
        };
    }

    /**
     * Bulk move files (with re-encryption)
     */
    async bulkMoveFiles(
        userId: string,
        updates: { fileId: string; encryptedKey: string; encapsulatedKey: string }[],
        folderId: string | null
    ): Promise<number> {
        return this.vaultRepository.bulkMoveFiles(
            updates.map(u => ({ ...u, folderId })),
            userId
        );
    }
}
