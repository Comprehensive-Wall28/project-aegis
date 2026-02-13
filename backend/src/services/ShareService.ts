import crypto from 'crypto';
import { Request } from 'express';
import { ServiceError } from './base/BaseService';
import { SharedFileRepository } from '../repositories/SharedFileRepository';
import { SharedLinkRepository } from '../repositories/SharedLinkRepository';
import { FileMetadataRepository } from '../repositories/FileMetadataRepository';
import { UserRepository } from '../repositories/UserRepository';
import { ISharedFile } from '../models/SharedFile';
import { ISharedLink } from '../models/SharedLink';
import logger from '../utils/logger';

export interface InviteDTO {
    id: string; // fileId
    email: string;
    encryptedSharedKey: string;
    permissions?: string[];
}

export interface CreateLinkDTO {
    resourceId: string;
    resourceType: 'file';
    encryptedKey: string;
    isPublic?: boolean;
    allowedEmails?: string[];
}

/**
 * ShareService handles internal sharing (user-to-user) and link creation
 */
export class ShareService {
    private sharedFileRepo: SharedFileRepository;
    private sharedLinkRepo: SharedLinkRepository;
    private fileRepo: FileMetadataRepository;
    private userRepo: UserRepository;

    constructor() {
        this.sharedFileRepo = new SharedFileRepository();
        this.sharedLinkRepo = new SharedLinkRepository();
        this.fileRepo = new FileMetadataRepository();
        this.userRepo = new UserRepository();
    }

    /**
     * Invite a user to a shared file
     */
    async inviteToFile(userId: string, data: InviteDTO, _req: Request): Promise<ISharedFile> {
        try {
            if (!data.id || !data.email || !data.encryptedSharedKey) {
                throw new ServiceError('Missing required fields', 400);
            }

            const file = await this.fileRepo.findByIdAndOwner(data.id, userId);
            if (!file) {
                throw new ServiceError('File not found', 404);
            }

            const recipient = await this.userRepo.findByEmail(data.email);
            if (!recipient) {
                throw new ServiceError('Recipient not found', 404);
            }

            if (recipient._id.toString() === userId) {
                throw new ServiceError('Cannot share file with yourself', 400);
            }

            const existing = await this.sharedFileRepo.findByFileAndUser(data.id, recipient._id.toString());
            if (existing) {
                throw new ServiceError('File already shared with this user', 400);
            }

            const sharedFile = await this.sharedFileRepo.create({
                fileId: data.id as any,
                sharedBy: userId as any,
                sharedWith: recipient._id as any,
                encryptedSharedKey: data.encryptedSharedKey,
                permissions: data.permissions || ['READ', 'DOWNLOAD']
            } as any);

            return sharedFile;

        } catch (error) {
            if (error instanceof ServiceError) throw error;
            logger.error('Invite to file error:', error);
            throw new ServiceError('Failed to share file', 500);
        }
    }

    /**
     * Get shared file key
     */
    async getSharedFileKey(userId: string, fileId: string): Promise<{ encryptedSharedKey: string }> {
        try {
            const sharedFile = await this.sharedFileRepo.findByFileAndUser(fileId, userId);
            if (!sharedFile) {
                throw new ServiceError('Access denied or file not shared', 403);
            }
            return { encryptedSharedKey: sharedFile.encryptedSharedKey };
        } catch (error) {
            if (error instanceof ServiceError) throw error;
            logger.error('Get shared file key error:', error);
            throw new ServiceError('Failed to fetch key', 500);
        }
    }

    /**
     * Create a shared link
     */
    async createLink(userId: string, data: CreateLinkDTO): Promise<ISharedLink> {
        try {
            if (!data.resourceId || !data.resourceType || !data.encryptedKey) {
                throw new ServiceError('Missing required fields', 400);
            }

            if (data.resourceType === 'file') {
                const file = await this.fileRepo.findByIdAndOwner(data.resourceId, userId);
                if (!file) throw new ServiceError('File not found', 404);
            } else {
                throw new ServiceError('Invalid resource type. Folder sharing is disabled.', 400);
            }

            const token = crypto.randomBytes(32).toString('hex');

            const sharedLink = await this.sharedLinkRepo.create({
                token,
                resourceId: data.resourceId as any,
                resourceType: data.resourceType,
                encryptedKey: data.encryptedKey,
                creatorId: userId as any,
                isPublic: data.isPublic !== false,
                allowedEmails: data.allowedEmails || []
            } as any);

            return sharedLink;

        } catch (error) {
            if (error instanceof ServiceError) throw error;
            logger.error('Create link error:', error);
            throw new ServiceError('Failed to create link', 500);
        }
    }

    /**
     * Get user's links
     */
    async getMyLinks(userId: string, page: number = 1, limit: number = 5): Promise<any> {
        try {
            const skip = (page - 1) * limit;

            const { links, total } = await this.sharedLinkRepo.findLinksByCreator(userId, skip, limit);

            const populatedLinks = await Promise.all(links.map(async (link: ISharedLink) => {
                const linkObj = link.toObject() as any;
                if (link.resourceType === 'file') {
                    const file = await this.fileRepo.findById(link.resourceId.toString());
                    if (file) {
                        linkObj.resourceDetails = {
                            originalFileName: file.originalFileName,
                            fileSize: file.fileSize,
                            mimeType: file.mimeType
                        };
                    }
                }
                return linkObj;
            }));

            return {
                links: populatedLinks,
                total,
                pages: Math.ceil(total / limit),
                currentPage: page
            };

        } catch (error) {
            logger.error('Get my links error:', error);
            throw new ServiceError('Failed to fetch links', 500);
        }
    }

    /**
     * Revoke a link
     */
    async revokeLink(userId: string, linkId: string): Promise<void> {
        try {
            // Check ownership
            const link = await this.sharedLinkRepo.findOne({
                _id: { $eq: linkId },
                creatorId: { $eq: userId }
            } as any);

            if (!link) {
                throw new ServiceError('Link not found or unauthorized', 404);
            }

            await this.sharedLinkRepo.deleteById(linkId);
        } catch (error) {
            if (error instanceof ServiceError) throw error;
            logger.error('Revoke link error:', error);
            throw new ServiceError('Failed to revoke link', 500);
        }
    }
}
