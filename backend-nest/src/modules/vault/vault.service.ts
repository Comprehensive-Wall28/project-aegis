import { Injectable, Logger, BadRequestException, ForbiddenException, NotFoundException, InternalServerErrorException } from '@nestjs/common';
import { VaultRepository } from './repositories/vault.repository';
import { UserRepository } from '../auth/repositories/user.repository';
import { UploadInitDto } from './dto/upload-init.dto';
import { GoogleDriveService } from './services/google-drive.service';
import { Types } from 'mongoose';

@Injectable()
export class VaultService {
    private readonly logger = new Logger(VaultService.name);
    private readonly MAX_STORAGE = 5 * 1024 * 1024 * 1024; // 5GB

    constructor(
        private readonly vaultRepository: VaultRepository,
        private readonly userRepository: UserRepository,
        private readonly googleDriveService: GoogleDriveService,
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
}
