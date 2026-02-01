import {
  Injectable,
  BadRequestException,
  NotFoundException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { SharedLinkRepository } from './repositories/shared-link.repository';
import { VaultRepository } from '../vault/vault.repository';
import { FolderRepository } from '../folders/folders.repository';
import { UsersRepository } from '../users/users.repository';
import { GoogleDriveService } from '../vault/google-drive.service';
import { AuditService } from '../../common/services/audit.service';
import { Readable } from 'stream';
import { FastifyRequest } from 'fastify';
import { Types } from 'mongoose';

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

@Injectable()
export class PublicShareService {
  private readonly logger = new Logger(PublicShareService.name);

  constructor(
    private readonly sharedLinkRepository: SharedLinkRepository,
    private readonly vaultRepository: VaultRepository,
    private readonly folderRepository: FolderRepository,
    private readonly usersRepository: UsersRepository,
    private readonly googleDriveService: GoogleDriveService,
    private readonly auditService: AuditService,
  ) {}

  async getLinkMetadata(
    token: string,
    req?: FastifyRequest,
  ): Promise<LinkMetadata> {
    if (!token) {
      throw new BadRequestException('Token is required');
    }

    const link = await this.sharedLinkRepository.findByToken(token);
    if (!link) {
      throw new NotFoundException('Link not found or expired');
    }

    await this.sharedLinkRepository.incrementViewCount(
      (link._id as unknown as Types.ObjectId).toString(),
    );

    let ownerName = 'Aegis User';
    let metadata: LinkMetadata['metadata'] | undefined;

    if (link.resourceType === 'file') {
      const file = await this.vaultRepository.findById(
        (link.resourceId as unknown as Types.ObjectId).toString(),
      );
      if (!file) {
        throw new NotFoundException('File not found');
      }

      if (file.ownerId) {
        const owner = await this.usersRepository.findById(
          (file.ownerId as unknown as Types.ObjectId).toString(),
        );
        if (owner) ownerName = owner.username;
      }

      metadata = {
        type: 'file',
        name: file.originalFileName,
        size: file.fileSize,
        mimeType: file.mimeType,
        createdAt: file.createdAt,
        id: (file._id as unknown as Types.ObjectId).toString(),
        ownerName,
      };
    } else {
      const folder = await this.folderRepository.findById(
        (link.resourceId as unknown as Types.ObjectId).toString(),
      );
      if (!folder) {
        throw new NotFoundException('Folder not found');
      }

      if (folder.ownerId) {
        const owner = await this.usersRepository.findById(
          (folder.ownerId as unknown as Types.ObjectId).toString(),
        );
        if (owner) ownerName = owner.username;
      }

      metadata = {
        type: 'folder',
        name: folder.name,
        createdAt: folder.createdAt,
        id: (folder._id as unknown as Types.ObjectId).toString(),
        ownerName,
      };
    }

    await this.auditService.logAuditEvent(
      (link.creatorId as unknown as Types.ObjectId).toString(),
      'READER_VIEW_ACCESS',
      'SUCCESS',
      req,
      { token, resourceId: link.resourceId },
    );

    if (!metadata) {
      throw new InternalServerErrorException('Metadata not found');
    }

    return {
      metadata,
      encryptedKey: link.encryptedKey,
      isPublic: link.isPublic,
      requiresAuth: !link.isPublic,
    };
  }

  async downloadSharedFile(
    token: string,
    req?: FastifyRequest,
  ): Promise<FileDownloadResponse> {
    if (!token) {
      throw new BadRequestException('Token is required');
    }

    const link = await this.sharedLinkRepository.findByToken(token);
    if (!link) {
      throw new NotFoundException('Link not found');
    }

    if (link.resourceType !== 'file') {
      throw new BadRequestException('Not a file link');
    }

    const fileRecord = await this.vaultRepository.findById(
      (link.resourceId as unknown as Types.ObjectId).toString(),
    );
    if (!fileRecord || !fileRecord.googleDriveFileId) {
      throw new NotFoundException('File not found');
    }

    // TODO: strict auth check for restricted links if needed
    // Assuming current implementation allows public download if link is valid
    // But logic says requiresAuth if !isPublic.
    // If !isPublic, we should probably check if user is authenticated/authorized.
    // Legacy code didn't implementation auth check in downloadSharedFile explicitly, just comment.

    try {
      const stream = await this.googleDriveService.getFileStream(
        fileRecord.googleDriveFileId,
      );
      const creatorIdStr = (
        link.creatorId as unknown as Types.ObjectId
      ).toString();

      await this.auditService.logAuditEvent(
        creatorIdStr,
        'FILE_SHARE', // reusing FILE_SHARE or create a new one like FILE_DOWNLOAD_SHARED
        'SUCCESS',
        req,
        {
          token,
          fileId: (fileRecord._id as unknown as Types.ObjectId).toString(),
        },
      );

      return {
        stream,
        mimeType: fileRecord.mimeType || 'application/octet-stream',
        fileName: fileRecord.originalFileName,
        fileSize: fileRecord.fileSize,
      };
    } catch (error) {
      this.logger.error('Shared file download error', error);
      throw new InternalServerErrorException('Download failed');
    }
  }
}
