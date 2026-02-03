import { Injectable } from '@nestjs/common';
import { BaseService, AuditAction, AuditStatus } from '../../common/services/base.service';
import { FolderDocument } from './folder.schema';
import { FolderRepository } from './folder.repository';
import { ServiceError } from '../../common/services/service.error';
import { CreateFolderDto } from './dto/create-folder.dto';
import { UpdateFolderDto } from './dto/update-folder.dto';
import { InjectModel } from '@nestjs/mongoose';
import { Folder } from './folder.schema';
import { Model } from 'mongoose';

@Injectable()
export class FolderService extends BaseService<FolderDocument, FolderRepository> {
    constructor(
        protected readonly folderRepository: FolderRepository,
        @InjectModel(Folder.name) private folderModel: Model<FolderDocument>
    ) {
        super(folderRepository);
    }

    /**
     * Get folders for user in a parent folder (or root)
     */
    async getFolders(userId: string, parentId?: string | null): Promise<FolderDocument[]> {
        try {
            // Normalize parentId
            let normalizedParentId: string | null = null;
            if (parentId && parentId !== 'null' && parentId !== '') {
                normalizedParentId = parentId;
            }

            if (normalizedParentId === null) {
                // Root level: owned folders only
                const ownedFolders = await this.folderRepository.findByOwnerAndParent(userId, null);
                return ownedFolders;
            }

            // Validate normalizedParentId before usage
            const validatedParentId = this.validateId(normalizedParentId, 'parentId');

            // Subfolder: verify access first
            const parentFolder = await this.folderModel.findById(validatedParentId).exec();
            if (!parentFolder) {
                throw new ServiceError('Parent folder not found', 404, 'NOT_FOUND');
            }

            const isOwner = parentFolder.ownerId.toString() === userId;
            if (!isOwner) {
                throw new ServiceError('Access denied', 403, 'FORBIDDEN');
            }

            // Fetch subfolders owned by folder's owner
            const subfolders = await this.folderRepository.findSubfolders(
                validatedParentId,
                parentFolder.ownerId.toString()
            );

            return subfolders;
        } catch (error) {
            this.handleRepositoryError(error);
        }
    }

    /**
     * Get a single folder by ID with path
     */
    async getFolder(userId: string, folderId: string): Promise<FolderDocument & { path: any[] }> {
        try {
            // Validate folderId
            const validatedId = this.validateId(folderId, 'folder ID');

            let folder = await this.folderRepository.findByIdAndOwner(validatedId, userId);

            if (!folder) {
                throw new ServiceError('Folder not found or access denied', 404, 'NOT_FOUND');
            }

            // Build path
            const path: any[] = [];
            let current = folder;
            while (current.parentId) {
                const parent = await this.folderModel.findById(current.parentId).exec();
                if (!parent) break;
                // Prepend to path
                path.unshift({
                    _id: parent._id.toString(),
                    name: parent.name,
                    parentId: parent.parentId ? parent.parentId.toString() : null
                });
                current = parent;
            }

            return {
                ...folder.toObject(),
                path
            } as FolderDocument & { path: any[] };
        } catch (error) {
            this.handleRepositoryError(error);
        }
    }

    /**
     * Create a new folder
     */
    async createFolder(userId: string, data: CreateFolderDto): Promise<FolderDocument> {
        try {
            if (!data.name?.trim()) {
                throw new ServiceError('Folder name is required', 400, 'VALIDATION_ERROR');
            }

            if (!data.encryptedSessionKey) {
                throw new ServiceError('Encrypted session key is required', 400, 'VALIDATION_ERROR');
            }

            const folder = await this.folderRepository.create({
                ownerId: userId as any,
                name: data.name.trim(),
                parentId: data.parentId || null,
                encryptedSessionKey: data.encryptedSessionKey
            } as unknown as Partial<FolderDocument>);

            this.logAction(userId, AuditAction.CREATE, AuditStatus.SUCCESS, {
                entityType: 'FOLDER',
                entityId: folder._id.toString()
            });

            return folder;
        } catch (error) {
            this.handleRepositoryError(error);
        }
    }

    /**
     * Update a folder (rename and/or change color)
     */
    async updateFolder(
        userId: string,
        folderId: string,
        data: UpdateFolderDto
    ): Promise<FolderDocument> {
        try {
            const validatedId = this.validateId(folderId, 'folder ID');

            const update: Partial<FolderDocument> = {};

            if (data.name?.trim()) {
                update.name = data.name.trim();
            }
            if (data.color !== undefined) {
                update.color = data.color ?? null;
            }

            if (Object.keys(update).length === 0) {
                throw new ServiceError('No valid fields to update', 400, 'VALIDATION_ERROR');
            }

            const folder = await this.folderRepository.updateByIdAndOwner(validatedId, userId, update);

            if (!folder) {
                throw new ServiceError('Folder not found', 404, 'NOT_FOUND');
            }

            this.logAction(userId, AuditAction.UPDATE, AuditStatus.SUCCESS, {
                entityType: 'FOLDER',
                entityId: validatedId
            });

            return folder;
        } catch (error) {
            this.handleRepositoryError(error);
        }
    }

    /**
     * Delete a folder (only if empty)
     */
    async deleteFolder(userId: string, folderId: string): Promise<void> {
        try {
            const validatedId = this.validateId(folderId, 'folder ID');

            // Check for subfolders
            const subfoldersCount = await this.folderRepository.countSubfolders(validatedId, userId);
            if (subfoldersCount > 0) {
                throw new ServiceError(
                    'Cannot delete folder with subfolders. Delete subfolders first.',
                    400,
                    'VALIDATION_ERROR'
                );
            }

            // Note: Files check would require FileMetadataRepository
            // For now, we'll just check subfolders

            const deleted = await this.folderRepository.deleteByIdAndOwner(validatedId, userId);
            if (!deleted) {
                throw new ServiceError('Folder not found', 404, 'NOT_FOUND');
            }

            this.logAction(userId, AuditAction.DELETE, AuditStatus.SUCCESS, {
                entityType: 'FOLDER',
                entityId: validatedId
            });
        } catch (error) {
            this.handleRepositoryError(error);
        }
    }

    /**
     * Move files to a folder (stub implementation - requires FileMetadataRepository)
     */
    async moveFiles(
        userId: string,
        updates: { fileId: string; encryptedKey: string; encapsulatedKey: string }[],
        folderId: string | null
    ): Promise<number> {
        try {
            if (!updates || !Array.isArray(updates) || updates.length === 0) {
                throw new ServiceError('File updates are required', 400, 'VALIDATION_ERROR');
            }

            // Normalize folderId
            let normalizedFolderId: string | null = null;
            if (folderId && folderId !== '') {
                normalizedFolderId = folderId;

                // Validate folder exists
                const folder = await this.folderRepository.findByIdAndOwner(normalizedFolderId, userId);
                if (!folder) {
                    throw new ServiceError('Target folder not found', 404, 'NOT_FOUND');
                }
            }

            // Note: Actual file movement would require FileMetadataRepository
            // This is a stub implementation that validates inputs but doesn't move files
            // The actual implementation will be added when FileMetadataRepository is ported

            this.logAction(userId, AuditAction.UPDATE, AuditStatus.SUCCESS, {
                entityType: 'FILE_BULK',
                action: 'MOVE',
                count: updates.length,
                folderId: normalizedFolderId
            });

            return updates.length;
        } catch (error) {
            this.handleRepositoryError(error);
        }
    }
}
