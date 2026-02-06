import { Injectable, Logger, BadRequestException, ForbiddenException, NotFoundException, InternalServerErrorException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { VaultRepository } from './repositories/vault.repository';
import { UserRepository } from '../auth/repositories/user.repository';
import { UploadInitDto } from './dto/upload-init.dto';
import { VaultListingRequestDto, VaultListingResponseDto } from './dto/vault-listing.dto';
import { GoogleDriveService } from './services/google-drive.service';
import { Types, Model } from 'mongoose';
import { Folder, FolderDocument } from './schemas/folder.schema';

@Injectable()
export class VaultService {
    private readonly logger = new Logger(VaultService.name);
    private readonly MAX_STORAGE = 5 * 1024 * 1024 * 1024; // 5GB

    constructor(
        private readonly vaultRepository: VaultRepository,
        private readonly userRepository: UserRepository,
        private readonly googleDriveService: GoogleDriveService,
        @InjectModel(Folder.name, 'primary')
        private readonly folderModel: Model<FolderDocument>,
    ) { }

    async initUpload(userId: string, data: UploadInitDto): Promise<{ fileId: string }> {
        try {
            // Check user storage limit
            const user = await this.userRepository.findById(userId);
            if (!user) {
                throw new NotFoundException('User not found');
            }

            if (user.totalStorageUsed + data.fileSize > this.MAX_STORAGE) {
                throw new ForbiddenException('Storage limit exceeded. Delete some files.');
            }

            // Initiate Google Drive resumable upload session
            const { sessionId, sessionUrl } = await this.googleDriveService.initiateUpload(
                data.originalFileName,
                data.fileSize,
                { ownerId: userId }
            );

            // Create file metadata record
            const fileRecord = await this.vaultRepository.create({
                ownerId: new Types.ObjectId(userId),
                folderId: data.folderId ? new Types.ObjectId(data.folderId) : null,
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
            } as any);

            return { fileId: fileRecord._id.toString() };
        } catch (error) {
            if (error instanceof BadRequestException || error instanceof ForbiddenException || error instanceof NotFoundException) {
                throw error;
            }
            this.logger.error('Upload init error:', error);
            throw new InternalServerErrorException('Failed to initialize upload');
        }
    }

    async uploadChunk(
        userId: string,
        fileId: string,
        contentRange: string,
        chunk: any,
        chunkLength: number,
    ): Promise<{ complete: boolean; receivedSize?: number; googleDriveFileId?: string }> {
        try {
            if (!fileId || !contentRange) {
                throw new BadRequestException('Missing fileId or Content-Range');
            }

            const fileRecord = await this.vaultRepository.findByIdAndStream(fileId, userId);
            if (!fileRecord || !fileRecord.uploadSessionUrl) {
                throw new NotFoundException('File not found or session invalid');
            }

            // Parse Content-Range: "bytes START-END/TOTAL"
            const rangeMatch = contentRange.match(/bytes (\d+)-(\d+)\/(\d+)/);
            if (!rangeMatch) {
                throw new BadRequestException('Invalid Content-Range header');
            }

            const rangeStart = parseInt(rangeMatch[1], 10);
            const rangeEnd = parseInt(rangeMatch[2], 10);
            const totalSize = parseInt(rangeMatch[3], 10);

            // Update status to uploading if still pending
            if (fileRecord.status === 'pending') {
                await this.vaultRepository.updateUploadStatus(fileId, 'uploading');
            }

            // Append chunk to Google Drive upload session
            const { complete, receivedSize } = await this.googleDriveService.appendChunk(
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
                await (fileRecord as any).save();
            }

            if (complete) {
                // Finalize the upload
                const googleDriveFileId = await this.googleDriveService.finalizeUpload(fileRecord.uploadSessionUrl, totalSize);
                await this.vaultRepository.completeUpload(fileId, googleDriveFileId);

                // Update user storage usage
                await this.userRepository.updateById(userId, {
                    $inc: { totalStorageUsed: fileRecord.fileSize }
                });

                return { complete: true, googleDriveFileId };
            }

            return { complete: false, receivedSize };
        } catch (error) {
            if (error instanceof BadRequestException || error instanceof ForbiddenException || error instanceof NotFoundException) {
                throw error;
            }
            this.logger.error('Upload chunk error:', error);
            throw new InternalServerErrorException('Failed to process chunk');
        }
    }

    async getUserFiles(
        userId: string,
        query: VaultListingRequestDto,
    ): Promise<VaultListingResponseDto | any[]> {
        try {
            const { folderId, limit, cursor, search } = query;

            if (folderId && folderId !== 'null') {
                if (!Types.ObjectId.isValid(folderId)) {
                    throw new BadRequestException('Invalid folder ID format');
                }

                const folder = await this.folderModel.findById(folderId);
                if (!folder) {
                    throw new NotFoundException('Folder not found');
                }

                if (folder.ownerId.toString() !== userId) {
                    throw new ForbiddenException('Access denied to this folder');
                }
            }

            if (limit !== undefined) {
                const result = await this.vaultRepository.findByOwnerAndFolderPaginated(
                    userId,
                    folderId || null,
                    { limit, cursor, search },
                );
                return {
                    items: result.items as any,
                    nextCursor: result.nextCursor,
                };
            }

            return await this.vaultRepository.findByOwnerAndFolder(userId, folderId || null, search);
        } catch (error) {
            if (error instanceof BadRequestException || error instanceof ForbiddenException || error instanceof NotFoundException) {
                throw error;
            }
            this.logger.error('Get files error:', error);
            throw new InternalServerErrorException('Failed to get files');
        }
    }

    async getFile(userId: string, fileId: string) {
        try {
            if (!Types.ObjectId.isValid(fileId)) {
                throw new BadRequestException('Invalid file ID format');
            }

            const file = await this.vaultRepository.findByIdAndOwner(fileId, userId);
            if (!file) {
                throw new NotFoundException('File not found');
            }

            return file;
        } catch (error) {
            if (error instanceof BadRequestException || error instanceof NotFoundException) {
                throw error;
            }
            this.logger.error(`Get file error: ${error}`);
            throw new InternalServerErrorException('Failed to get file');
        }
    }

    async getDownloadStream(
        userId: string,
        fileId: string,
    ): Promise<{ stream: any; file: any }> {
        try {
            if (!Types.ObjectId.isValid(fileId)) {
                throw new BadRequestException('Invalid file ID format');
            }

            const fileRecord = await this.vaultRepository.findByIdAndOwner(fileId, userId);

            if (!fileRecord || !fileRecord.googleDriveFileId) {
                throw new NotFoundException('File not found or access denied');
            }

            const stream = await this.googleDriveService.getFileStream(fileRecord.googleDriveFileId);

            return { stream, file: fileRecord };
        } catch (error) {
            if (error instanceof BadRequestException || error instanceof NotFoundException) {
                throw error;
            }
            this.logger.error('Download error:', error);
            throw new InternalServerErrorException('Download failed');
        }
    }

    async deleteFile(userId: string, fileId: string): Promise<void> {
        try {
            if (!Types.ObjectId.isValid(fileId)) {
                throw new BadRequestException('Invalid file ID format');
            }

            const fileRecord = await this.vaultRepository.findByIdAndOwner(fileId, userId);

            if (!fileRecord) {
                throw new NotFoundException('File not found');
            }

            // Delete from Google Drive if file was uploaded
            if (fileRecord.googleDriveFileId) {
                await this.googleDriveService.deleteFile(fileRecord.googleDriveFileId);
            }

            // Delete metadata record
            await this.vaultRepository.deleteByIdAndOwner(fileId, userId);

            // Update user storage usage (decrement)
            if (fileRecord.status === 'completed') {
                await this.userRepository.updateById(userId, {
                    $inc: { totalStorageUsed: -fileRecord.fileSize }
                });
            }
        } catch (error) {
            if (error instanceof BadRequestException || error instanceof NotFoundException) {
                throw error;
            }
            this.logger.error('Delete file error:', error);
            throw new InternalServerErrorException('Delete failed');
        }
    }
}
