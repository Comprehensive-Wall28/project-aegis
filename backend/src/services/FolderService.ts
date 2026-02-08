import { BaseService, ServiceError } from './base/BaseService';
import mongoose from 'mongoose';
import { FolderRepository } from '../repositories/FolderRepository';
import { FileMetadataRepository } from '../repositories/FileMetadataRepository';
import { IFolder } from '../models/Folder';
import Folder from '../models/Folder';
import logger from '../utils/logger';
import { CacheInvalidator, withCache } from '../utils/cacheUtils';
import CacheKeyBuilder from './cache/CacheKeyBuilder';

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

            const cacheKey = CacheKeyBuilder.folderList(userId, normalizedParentId);

            return await withCache(
                { key: cacheKey, ttl: 300000 },
                async () => {
                    if (normalizedParentId === null) {
                        // Root level: owned folders only (shared folders removed)
                        const ownedFolders = await this.repository.findByOwnerAndParent(userId, null);
                        return ownedFolders;
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
                    if (!isOwner) {
                        throw new ServiceError('Access denied', 403);
                    }

                    // Fetch subfolders owned by folder's owner
                    const subfolders = await this.repository.findSubfolders(
                        normalizedParentId,
                        parentFolder.ownerId.toString()
                    );

                    return subfolders;
                }
            );
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
                ownerId: new mongoose.Types.ObjectId(userId),
                name: data.name.trim(),
                parentId: data.parentId ? new mongoose.Types.ObjectId(data.parentId) : null,
                encryptedSessionKey: data.encryptedSessionKey
            } as any);

            // Invalidate folder caches for this user
            CacheInvalidator.userFolders(userId);

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

            // Invalidate folder caches for this user
            CacheInvalidator.userFolders(userId);

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

            // Invalidate folder caches for this user
            CacheInvalidator.userFolders(userId);
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
        updates: { fileId: string; encryptedKey: string; encapsulatedKey: string }[],
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
                encapsulatedKey: u.encapsulatedKey,
                folderId: normalizedFolderId
            }));

            const result = await this.fileMetadataRepo.bulkMoveFiles(bulkUpdates, userId);

            // Invalidate file list caches for the user
            CacheInvalidator.userFiles(userId);

            return result;
        } catch (error) {
            if (error instanceof ServiceError) throw error;
            logger.error('Move files error:', error);
            throw new ServiceError('Failed to move files', 500);
        }
    }


}
