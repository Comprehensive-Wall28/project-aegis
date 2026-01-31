import { Injectable, NotFoundException, ForbiddenException, BadRequestException, Logger, Inject, forwardRef } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { VaultFile, VaultFileDocument, StorageProvider, FileStatus } from './schemas/vault-file.schema';
import { UploadInitDto } from './dto/upload-init.dto';
import { GridFsService } from './gridfs.service';
import { GoogleDriveService } from './google-drive.service';
import { UsersService } from '../users/users.service';
import { FoldersService } from '../folders/folders.service';
import { Readable } from 'stream';

@Injectable()
export class VaultService {
    private readonly logger = new Logger(VaultService.name);
    private readonly MAX_STORAGE = 5 * 1024 * 1024 * 1024; // 5GB

    constructor(
        @InjectModel(VaultFile.name) private vaultFileModel: Model<VaultFileDocument>,
        private readonly gridFsService: GridFsService,
        private readonly googleDriveService: GoogleDriveService,
        private readonly usersService: UsersService,
        @Inject(forwardRef(() => FoldersService)) private readonly foldersService: FoldersService,
    ) { }

    /**
     * Initialize file upload
     */
    async initiateUpload(userId: string, data: UploadInitDto): Promise<{ fileId: string; sessionKey?: string }> {
        // Check user storage limit
        const user = await this.usersService.findById(userId);
        if (!user) {
            throw new NotFoundException('User not found');
        }

        if (user.totalStorageUsed + data.fileSize > this.MAX_STORAGE) {
            throw new ForbiddenException('Storage limit exceeded');
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
            // In this simple implementation, we assume direct streaming via controller or buffer upload
            // But for consistency with the frontend flow that expects a session, we can generate one.
            uploadStreamId = new Types.ObjectId().toString(); // Placeholder
        }

        // Create metadata record
        const file = new this.vaultFileModel({
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
        });

        await file.save();

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
    ): Promise<{ complete: boolean; receivedSize: number }> {
        const file = await this.vaultFileModel.findOne({ _id: fileId, ownerId: userId });
        if (!file || !file.uploadStreamId) {
            throw new NotFoundException('File upload session not found');
        }

        if (file.status === FileStatus.PENDING) {
            file.status = FileStatus.UPLOADING;
            await file.save();
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
                file.googleDriveFileId = driveFileId;
                file.status = FileStatus.COMPLETED;
                file.uploadStreamId = undefined;
                await file.save();

                // Update usage
                await this.usersService.updateStorageUsage(userId, file.fileSize);
            }

            return result;
        } else {
            // GridFS Chunking Logic
            // Note: The GridFS service we have is designed for full stream or buffer.
            // Supporting chunked uploads for GridFS requires a temporary staging area or keeping a stream open.
            // For now, we'll assume the client sends the whole file in one go for GridFS (standard multipart)
            // OR we implement a basic "append" logic if we were using a temp file.
            // Given the complexity constraints, we will assume GridFS uploads use the standard /upload endpoint 
            // created below, not the chunked one, OR we throw error here.

            // However, to satisfy the "Dual Storage" requirement where frontend uses same logic:
            // We should ideally buffer chunks in a temporary file? 
            // Or simple reject chunked uploads for GridFS and force standard upload.

            throw new BadRequestException('Chunked upload not supported for GridFS in this version. Use standard multipart upload.');
        }
    }

    /**
     * Complete GridFS upload (called from controller after multipart flow)
     */
    async completeGridFsUpload(userId: string, fileId: string, gridFsId: Types.ObjectId) {
        const file = await this.vaultFileModel.findOne({ _id: fileId, ownerId: userId });
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
        const file = await this.vaultFileModel.findById(fileId);
        if (!file) {
            throw new NotFoundException('File not found');
        }

        // Check ownership or shared access
        let hasAccess = file.ownerId.toString() === userId;
        if (!hasAccess && file.folderId) {
            // Check folder sharing
            hasAccess = await this.foldersService.checkAccess(userId, file.folderId.toString());
        }

        if (!hasAccess) {
            throw new ForbiddenException('Access denied');
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
    async deleteFile(userId: string, fileId: string): Promise<void> {
        const file = await this.vaultFileModel.findOne({ _id: fileId, ownerId: userId });
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

        await this.vaultFileModel.deleteOne({ _id: fileId });
        await this.usersService.updateStorageUsage(userId, -file.fileSize);
    }

    /**
     * List files
     */
    async listFiles(userId: string, folderId?: string): Promise<{ items: VaultFile[]; nextCursor: string | null }> {
        const query: any = { ownerId: userId };

        if (folderId && folderId !== 'root') {
            query.folderId = new Types.ObjectId(folderId);
        } else {
            query.folderId = null;
        }

        const items = await this.vaultFileModel.find(query).sort({ createdAt: -1 }).exec();

        return {
            items,
            nextCursor: null // Pagination not yet fully implemented on backend, but structure required by frontend
        };
    }

    async countFiles(userId: string, folderId: string): Promise<number> {
        return this.vaultFileModel.countDocuments({ ownerId: userId, folderId }).exec();
    }
    async getStorageStats(userId: string): Promise<{ used: number; total: number; limit: number }> {
        const user = await this.usersService.findById(userId);
        if (!user) throw new NotFoundException('User not found');

        return {
            used: user.totalStorageUsed,
            total: user.totalStorageUsed, // Legacy frontend might use 'total' as 'used' or similar, strict adherence to interface needed
            limit: this.MAX_STORAGE
        };
    }
}
