import { BaseService, ServiceError } from './base/BaseService';
import mongoose from 'mongoose';
import { FolderRepository } from '../repositories/FolderRepository';
import { FileMetadataRepository } from '../repositories/FileMetadataRepository';
import { IFolder } from '../models/Folder';
import SharedFolder from '../models/SharedFolder';
import Folder from '../models/Folder';
import logger from '../utils/logger';

/**
 * DTO for creating a folder
 */
export interface CreateFolderDTO {
    name: string;
    parentId?: string | null;
    encryptedSessionKey: string;
}

/**
 * DTO for updating a folder
 */
export interface UpdateFolderDTO {
    name?: string;
    color?: string | null;
}

/**
 * FolderService handles folder business logic
 */
export class FolderService extends BaseService<IFolder, FolderRepository> {
    private fileMetadataRepo: FileMetadataRepository;

    constructor() {
        super(new FolderRepository());
        this.fileMetadataRepo = new FileMetadataRepository();
    }

    /**
     * Get folders for user in a parent folder (or root)
     */
    async getFolders(userId: string, parentId?: string | null): Promise<any[]> {
        try {
            // Normalize parentId
            let normalizedParentId: string | null = null;
            if (parentId && parentId !== 'null' && parentId !== '') {
                normalizedParentId = parentId;
            }

            if (normalizedParentId === null) {
                // Root level: owned folders + shared folders
                const ownedFolders = await this.repository.findByOwnerAndParent(userId, null);

                const sharedFolderEntries = await SharedFolder.find({ sharedWith: userId })
                    .populate('folderId');

                const sharedFolders = sharedFolderEntries
                    .filter(sf => sf.folderId)
                    .map(sf => {
                        const f = sf.folderId as any;
                        return {
                            ...f.toObject(),
                            isSharedWithMe: true,
                            encryptedSharedKey: sf.encryptedSharedKey,
                            permissions: sf.permissions
                        };
                    });

                return [...ownedFolders, ...sharedFolders];
            }

            // Validate normalizedParentId before usage
            if (!mongoose.isValidObjectId(normalizedParentId)) {
                logger.warn(`Invalid parentId format in getFolders: ${normalizedParentId}`);
                throw new ServiceError('Invalid folder ID format', 400);
            }

            // Subfolder: verify access first
            const parentFolder = await Folder.findById(normalizedParentId);
            if (!parentFolder) {
                throw new ServiceError('Parent folder not found', 404);
            }

            const isOwner = parentFolder.ownerId.toString() === userId;
            let hasAccess = isOwner;

            if (!hasAccess) {
                hasAccess = await this.checkSharedAccess(normalizedParentId, userId, parentFolder);
            }

            if (!hasAccess) {
                throw new ServiceError('Access denied', 403);
            }

            // Fetch subfolders owned by folder's owner
            const subfolders = await this.repository.findSubfolders(
                normalizedParentId,
                parentFolder.ownerId.toString()
            );

            // Mark as shared if not owner
            if (!isOwner) {
                return subfolders.map(f => ({
                    ...f.toObject(),
                    isSharedWithMe: true
                }));
            }

            return subfolders;
        } catch (error: any) {
            if (error instanceof ServiceError) throw error;

            if (error.name === 'CastError') {
                logger.warn(`CastError in getFolders: ${error.message}`);
                throw new ServiceError('Invalid ID format', 400);
            }

            logger.error('Get folders error:', error);
            throw new ServiceError('Failed to get folders', 500);
        }
    }

    /**
     * Get a single folder by ID
     */
    async getFolder(userId: string, folderId: string): Promise<IFolder & { path: any[] }> {
        try {
            // Validate folderId
            if (!folderId || !mongoose.isValidObjectId(folderId)) {
                throw new ServiceError('Invalid folder ID', 400);
            }

            let folder = await this.repository.findByIdAndOwner(folderId, userId);

            if (!folder) {
                // Check shared access
                const isShared = await SharedFolder.findOne({
                    folderId: { $eq: folderId },
                    sharedWith: { $eq: userId }
                });
                if (isShared) {
                    folder = await this.repository.findById(folderId);
                }
            }

            if (!folder) {
                // Check ancestor shared access (if not directly shared)
                // This covers the case where we are accessing a subfolder of a shared folder
                const targetFolder = await Folder.findById(folderId);
                if (targetFolder) {
                    const hasAccess = await this.checkSharedAccess(folderId, userId, targetFolder);
                    if (hasAccess) {
                        folder = targetFolder;
                    }
                }
            }

            if (!folder) {
                throw new ServiceError('Folder not found or access denied', 404);
            }

            // Build path
            const path: any[] = [];
            let current = folder;
            while (current.parentId) {
                const parent = await Folder.findById(current.parentId);
                if (!parent) break;
                // Prepend to path
                path.unshift({
                    _id: parent._id,
                    name: parent.name,
                    parentId: parent.parentId
                });
                current = parent;
            }

            return {
                ...folder.toObject(),
                path
            };
        } catch (error) {
            if (error instanceof ServiceError) throw error;
            logger.error('Get folder error:', error);
            throw new ServiceError('Failed to get folder', 500);
        }
    }

    /**
     * Create a new folder
     */
    async createFolder(userId: string, data: CreateFolderDTO): Promise<IFolder> {
        try {
            if (!data.name?.trim()) {
                throw new ServiceError('Folder name is required', 400);
            }

            if (!data.encryptedSessionKey) {
                throw new ServiceError('Encrypted session key is required', 400);
            }

            const folder = await this.repository.create({
                ownerId: userId as any,
                name: data.name.trim(),
                parentId: data.parentId || null,
                encryptedSessionKey: data.encryptedSessionKey
            } as any);

            logger.info(`Folder created: ${folder.name} for user ${userId}`);
            return folder;
        } catch (error) {
            if (error instanceof ServiceError) throw error;
            logger.error('Create folder error:', error);
            throw new ServiceError('Failed to create folder', 500);
        }
    }

    /**
     * Update a folder (rename and/or change color)
     */
    async updateFolder(
        userId: string,
        folderId: string,
        data: UpdateFolderDTO
    ): Promise<IFolder> {
        try {
            const update: Partial<IFolder> = {};

            if (data.name?.trim()) {
                update.name = data.name.trim();
            }
            if (data.color !== undefined) {
                update.color = data.color ?? undefined;
            }

            if (Object.keys(update).length === 0) {
                throw new ServiceError('No valid fields to update', 400);
            }

            const folder = await this.repository.updateByIdAndOwner(folderId, userId, update);

            if (!folder) {
                throw new ServiceError('Folder not found', 404);
            }

            logger.info(`Folder updated: ${folder.name} for user ${userId}`);
            return folder;
        } catch (error) {
            if (error instanceof ServiceError) throw error;
            logger.error('Update folder error:', error);
            throw new ServiceError('Failed to update folder', 500);
        }
    }

    /**
     * Delete a folder (only if empty)
     */
    async deleteFolder(userId: string, folderId: string): Promise<void> {
        try {
            // Check for files
            const filesCount = await this.fileMetadataRepo.count({
                folderId: { $eq: folderId as any },
                ownerId: { $eq: userId as any }
            } as any);

            if (filesCount > 0) {
                throw new ServiceError(
                    'Cannot delete folder with files. Move or delete files first.',
                    400
                );
            }

            // Check for subfolders
            const subfoldersCount = await this.repository.countSubfolders(folderId, userId);
            if (subfoldersCount > 0) {
                throw new ServiceError(
                    'Cannot delete folder with subfolders. Delete subfolders first.',
                    400
                );
            }

            const deleted = await this.repository.deleteByIdAndOwner(folderId, userId);
            if (!deleted) {
                throw new ServiceError('Folder not found', 404);
            }

            logger.info(`Folder deleted for user ${userId}`);
        } catch (error) {
            if (error instanceof ServiceError) throw error;
            logger.error('Delete folder error:', error);
            throw new ServiceError('Failed to delete folder', 500);
        }
    }

    /**
     * Move files to a folder (with re-encryption)
     */
    async moveFiles(
        userId: string,
        updates: { fileId: string; encryptedKey: string }[],
        folderId: string | null
    ): Promise<number> {
        try {
            if (!updates || !Array.isArray(updates) || updates.length === 0) {
                throw new ServiceError('File updates are required', 400);
            }

            // Normalize folderId
            let normalizedFolderId: string | null = null;
            if (folderId && folderId !== '') {
                normalizedFolderId = folderId;

                // Validate folder exists
                const folder = await this.repository.findByIdAndOwner(normalizedFolderId, userId);
                if (!folder) {
                    throw new ServiceError('Target folder not found', 404);
                }
            }

            const bulkUpdates = updates.map(u => ({
                fileId: u.fileId,
                encryptedKey: u.encryptedKey,
                folderId: normalizedFolderId
            }));

            const result = await this.fileMetadataRepo.bulkMoveFiles(bulkUpdates, userId);

            logger.info(`Moved ${result} files to folder ${normalizedFolderId || 'root'} for user ${userId}`);
            return result;
        } catch (error) {
            if (error instanceof ServiceError) throw error;
            logger.error('Move files error:', error);
            throw new ServiceError('Failed to move files', 500);
        }
    }

    /**
     * Check if user has shared access to a folder (direct or ancestor)
     */
    private async checkSharedAccess(
        folderId: string,
        userId: string,
        folder: IFolder
    ): Promise<boolean> {
        // Check direct share
        const directShare = await SharedFolder.findOne({
            folderId,
            sharedWith: userId
        });
        if (directShare) {
            return true;
        }

        // Check ancestors
        let current = folder;
        while (current.parentId) {
            const ancestorShare = await SharedFolder.findOne({
                folderId: current.parentId,
                sharedWith: userId
            });
            if (ancestorShare) {
                return true;
            }
            const parent = await Folder.findById(current.parentId);
            if (!parent) break;
            current = parent;
        }

        return false;
    }
}
