import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { randomBytes } from 'crypto';
import { SharedFileRepository } from './repositories/shared-file.repository';
import { SharedLinkRepository } from './repositories/shared-link.repository';
import { SharedFileDocument } from './schemas/shared-file.schema';
import { SharedLinkDocument } from './schemas/shared-link.schema';
import { VaultRepository } from '../vault/vault.repository';
import { UsersRepository } from '../users/users.repository';
import { InviteDto, CreateLinkDto } from './dto/share.dto';
import { AuditService } from '../../common/services/audit.service';
import { FastifyRequest } from 'fastify';
import { Types } from 'mongoose';

export interface LinkWithDetails {
  token: string;
  resourceId: Types.ObjectId;
  resourceType: string;
  encryptedKey: string;
  creatorId: Types.ObjectId;
  views: number;
  isPublic: boolean;
  allowedEmails: string[];
  resourceDetails?: {
    originalFileName: string;
    fileSize: number;
    mimeType: string;
  };
}

@Injectable()
export class ShareService {
  private readonly logger = new Logger(ShareService.name);

  constructor(
    private readonly sharedFileRepository: SharedFileRepository,
    private readonly sharedLinkRepository: SharedLinkRepository,
    private readonly vaultRepository: VaultRepository,
    private readonly usersRepository: UsersRepository,
    private readonly auditService: AuditService,
  ) {}

  async inviteToFile(
    userId: string,
    data: InviteDto,
    req?: FastifyRequest,
  ): Promise<SharedFileDocument> {
    if (!data.fileId || !data.email || !data.encryptedSharedKey) {
      throw new BadRequestException('Missing required fields');
    }

    const file = await this.vaultRepository.findByIdAndOwner(
      data.fileId,
      userId,
    );
    if (!file) {
      throw new NotFoundException('File not found');
    }

    const recipient = await this.usersRepository.findByEmail(data.email);
    if (!recipient) {
      throw new NotFoundException('Recipient not found');
    }

    if (recipient._id.toString() === userId) {
      throw new BadRequestException('Cannot share file with yourself');
    }

    const existing = await this.sharedFileRepository.findByFileAndUser(
      data.fileId,
      recipient._id.toString(),
    );
    if (existing) {
      throw new BadRequestException('File already shared with this user');
    }

    const sharedFile = await this.sharedFileRepository.create({
      fileId: new Types.ObjectId(data.fileId),
      sharedBy: new Types.ObjectId(userId),
      sharedWith: recipient._id as unknown as Types.ObjectId,
      encryptedSharedKey: data.encryptedSharedKey,
      permissions: data.permissions || ['READ', 'DOWNLOAD'],
    } as unknown as SharedFileDocument);

    await this.auditService.logAuditEvent(
      userId,
      'FILE_SHARE',
      'SUCCESS',
      req,
      {
        fileId: data.fileId,
        sharedWithId: recipient._id.toString(),
        sharedWithEmail: data.email,
      },
    );

    return sharedFile;
  }

  async getSharedFileKey(
    userId: string,
    fileId: string,
  ): Promise<{ encryptedSharedKey: string }> {
    const sharedFile = await this.sharedFileRepository.findByFileAndUser(
      fileId,
      userId,
    );
    if (!sharedFile) {
      throw new ForbiddenException('Access denied or file not shared');
    }
    return { encryptedSharedKey: sharedFile.encryptedSharedKey };
  }

  async createLink(
    userId: string,
    data: CreateLinkDto,
    req?: FastifyRequest,
  ): Promise<SharedLinkDocument> {
    if (!data.resourceId || !data.resourceType || !data.encryptedKey) {
      throw new BadRequestException('Missing required fields');
    }

    if (data.resourceType === 'file') {
      const file = await this.vaultRepository.findByIdAndOwner(
        data.resourceId,
        userId,
      );
      if (!file) throw new NotFoundException('File not found');
    } else {
      throw new BadRequestException(
        'Invalid resource type. Folder sharing is disabled.',
      );
    }

    const token = randomBytes(32).toString('hex');

    const sharedLink = await this.sharedLinkRepository.create({
      token,
      resourceId: new Types.ObjectId(data.resourceId),
      resourceType: data.resourceType,
      encryptedKey: data.encryptedKey,
      creatorId: new Types.ObjectId(userId),
      isPublic: data.isPublic !== false,
      allowedEmails: data.allowedEmails || [],
    } as unknown as SharedLinkDocument);

    await this.auditService.logAuditEvent(
      userId,
      'LINK_SHARE_CREATE',
      'SUCCESS',
      req,
      {
        linkId: sharedLink._id.toString(),
        resourceId: data.resourceId,
        resourceType: data.resourceType,
      },
    );

    return sharedLink;
  }

  async getMyLinks(
    userId: string,
    page: number = 1,
    limit: number = 5,
  ): Promise<{
    links: LinkWithDetails[];
    total: number;
    pages: number;
    currentPage: number;
  }> {
    const skip = (page - 1) * limit;
    const { links, total } = await this.sharedLinkRepository.findLinksByCreator(
      userId,
      skip,
      limit,
    );

    const populatedLinks = await Promise.all(
      links.map(async (link) => {
        const linkObj = link.toObject() as LinkWithDetails;
        if (link.resourceType === 'file') {
          const file = await this.vaultRepository.findById(
            (link.resourceId as unknown as Types.ObjectId).toString(),
          );
          if (file) {
            linkObj.resourceDetails = {
              originalFileName: file.originalFileName,
              fileSize: file.fileSize,
              mimeType: file.mimeType,
            };
          }
        }
        return linkObj;
      }),
    );

    return {
      links: populatedLinks,
      total,
      pages: Math.ceil(total / limit),
      currentPage: page,
    };
  }

  async revokeLink(
    userId: string,
    linkId: string,
    req?: FastifyRequest,
  ): Promise<void> {
    const link = await this.sharedLinkRepository.findById(linkId);

    if (!link) {
      throw new NotFoundException('Link not found');
    }

    if ((link.creatorId as unknown as Types.ObjectId).toString() !== userId) {
      throw new ForbiddenException('Unauthorized to revoke this link');
    }

    await this.sharedLinkRepository.deleteById(linkId);

    await this.auditService.logAuditEvent(
      userId,
      'LINK_SHARE_REVOKE',
      'SUCCESS',
      req,
      {
        linkId,
      },
    );
  }
}
