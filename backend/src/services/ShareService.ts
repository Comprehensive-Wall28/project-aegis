import crypto from 'crypto';
import { Request } from 'express';
import { BaseService, ServiceError } from './base/BaseService';
import { SharedFolderRepository } from '../repositories/SharedFolderRepository';
import { SharedFileRepository } from '../repositories/SharedFileRepository';
import { SharedLinkRepository } from '../repositories/SharedLinkRepository';
import { FolderRepository } from '../repositories/FolderRepository';
import { FileMetadataRepository } from '../repositories/FileMetadataRepository';
import { UserRepository } from '../repositories/UserRepository';
import { ISharedFolder } from '../models/SharedFolder';
import { ISharedFile } from '../models/SharedFile';
import { ISharedLink } from '../models/SharedLink';
import logger from '../utils/logger';

export interface InviteDTO {
    id: string; // folderId or fileId
    email: string;
    encryptedSharedKey: string;
    permissions?: string[];
}

export interface CreateLinkDTO {
    resourceId: string;
    resourceType: 'file' | 'folder';
    encryptedKey: string;
    isPublic?: boolean;
    allowedEmails?: string[];
}

/**
 * ShareService handles internal sharing (user-to-user) and link creation
 */
export class ShareService {
    private sharedFolderRepo: SharedFolderRepository;
    private sharedFileRepo: SharedFileRepository;
    private sharedLinkRepo: SharedLinkRepository;
    private folderRepo: FolderRepository;
    private fileRepo: FileMetadataRepository;
    private userRepo: UserRepository;

    constructor() {
        this.sharedFolderRepo = new SharedFolderRepository();
        this.sharedFileRepo = new SharedFileRepository();
        this.sharedLinkRepo = new SharedLinkRepository();
        this.folderRepo = new FolderRepository();
        this.fileRepo = new FileMetadataRepository();
        this.userRepo = new UserRepository();
    }

    /**
     * Invite a user to a shared folder
     */
    async inviteToFolder(userId: string, data: InviteDTO, req: Request): Promise<ISharedFolder> {
        try {
            if (!data.id || !data.email || !data.encryptedSharedKey) {
                throw new ServiceError('Missing required fields', 400);
            }

            // Check owner
            const folder = await this.folderRepo.findByIdAndOwner(data.id, userId);
            if (!folder) {
                throw new ServiceError('Folder not found', 404);
            }

            // Find recipient
            const recipient = await this.userRepo.findByEmail(data.email);
            if (!recipient) {
                throw new ServiceError('Recipient not found', 404);
            }

            if (recipient._id.toString() === userId) {
                throw new ServiceError('Cannot share folder with yourself', 400);
            }

            // Check existing share
            const existing = await this.sharedFolderRepo.findByFolderAndUser(data.id, recipient._id.toString());
            if (existing) {
                throw new ServiceError('Folder already shared with this user', 400);
            }

            const sharedFolder = await this.sharedFolderRepo.create({
                folderId: data.id as any,
                sharedBy: userId as any,
                sharedWith: recipient._id as any,
                encryptedSharedKey: data.encryptedSharedKey,
                permissions: data.permissions || ['READ', 'DOWNLOAD']
            } as any);

            if (!folder.isShared) {
                await this.folderRepo.updateById(folder._id.toString(), { isShared: true } as any);
            }

            return sharedFolder;

        } catch (error) {
            if (error instanceof ServiceError) throw error;
            logger.error('Invite to folder error:', error);
            throw new ServiceError('Failed to share folder', 500);
        }
    }

    /**
     * Invite a user to a shared file
     */
    async inviteToFile(userId: string, data: InviteDTO, req: Request): Promise<ISharedFile> {
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
     * Get folders shared with user
     */
    async getSharedWithMe(userId: string): Promise<ISharedFolder[]> {
        try {
            return await this.sharedFolderRepo.findSharedWithUser(userId);
        } catch (error) {
            logger.error('Get shared folders error:', error);
            throw new ServiceError('Failed to fetch shared folders', 500);
        }
    }

    /**
     * Get shared folder key
     */
    async getSharedFolderKey(userId: string, folderId: string): Promise<{ encryptedSharedKey: string }> {
        try {
            const sharedFolder = await this.sharedFolderRepo.findByFolderAndUser(folderId, userId);
            if (!sharedFolder) {
                throw new ServiceError('Access denied or folder not shared', 403);
            }
            return { encryptedSharedKey: sharedFolder.encryptedSharedKey };
        } catch (error) {
            if (error instanceof ServiceError) throw error;
            logger.error('Get shared folder key error:', error);
            throw new ServiceError('Failed to fetch key', 500);
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
            } else if (data.resourceType === 'folder') {
                const folder = await this.folderRepo.findByIdAndOwner(data.resourceId, userId);
                if (!folder) throw new ServiceError('Folder not found', 404);
            } else {
                throw new ServiceError('Invalid resource type', 400);
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

            // Using base repository findMany/count would be cleaner but complex due to custom population/filter logic in original
            // We'll use the repository methods we add to SharedLinkRepository or just use raw find for now in repo
            // Since SharedLinkRepository inherits BaseRepository, we can extend it.
            // For now, let's assume we can add a method there or use what exists.


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
                } else {
                    const folder = await this.folderRepo.findById(link.resourceId.toString());
                    if (folder) {
                        linkObj.resourceDetails = { name: folder.name };
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
