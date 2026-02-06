import { Injectable, Logger, BadRequestException, NotFoundException, ForbiddenException, InternalServerErrorException, Inject, forwardRef } from '@nestjs/common';
import { FolderRepository } from './repositories/folder.repository';
import { VaultRepository } from '../vault/repositories/vault.repository';
import { FolderResponseDto } from './dto/folder-response.dto';
import { CreateFolderRequestDto } from './dto/create-folder-request.dto';
import { UpdateFolderRequestDto } from './dto/update-folder-request.dto';
import { Types } from 'mongoose';
import { FolderDocument } from './schemas/folder.schema';

@Injectable()
export class FoldersService {
    private readonly logger = new Logger(FoldersService.name);

    constructor(
        private readonly folderRepository: FolderRepository,
        @Inject(forwardRef(() => VaultRepository))
        private readonly vaultRepository: VaultRepository,
    ) { }

    /**
     * Get folders for user in a parent folder (or root)
     */
    async getFolders(userId: string, parentId?: string | null): Promise<FolderResponseDto[]> {
        try {
            // Normalize parentId
            let normalizedParentId: string | null = null;
            if (parentId && parentId !== 'null' && parentId !== '') {
                normalizedParentId = parentId;
            }

            if (normalizedParentId === null) {
                // Root level
                const ownedFolders = await this.folderRepository.findByOwnerAndParent(userId, null);
                return ownedFolders as unknown as FolderResponseDto[];
            }

            // Validate normalizedParentId
            if (!Types.ObjectId.isValid(normalizedParentId)) {
                throw new BadRequestException('Invalid folder ID format');
            }

            // Subfolder: verify access first
            const parentFolder = await this.folderRepository.findById(normalizedParentId);
            if (!parentFolder) {
                throw new NotFoundException('Parent folder not found');
            }

            if (parentFolder.ownerId.toString() !== userId) {
                // In legacy backend it checks parentFolder.ownerId.toString() === userId
                // and then fetches subfolders owned by folder's owner.
                // This means you can only list subfolders of folders you own.
                throw new ForbiddenException('Access denied');
            }

            const subfolders = await this.folderRepository.findSubfolders(
                normalizedParentId,
                parentFolder.ownerId.toString()
            );

            return subfolders as unknown as FolderResponseDto[];
        } catch (error) {
            if (error instanceof BadRequestException || error instanceof NotFoundException || error instanceof ForbiddenException) {
                throw error;
            }
            this.logger.error('Get folders error:', error);
            throw new InternalServerErrorException('Failed to get folders');
        }
    }

    /**
     * Get a single folder by ID
     */
    async getFolder(userId: string, folderId: string): Promise<FolderResponseDto> {
        try {
            // Validate folderId
            if (!folderId || !Types.ObjectId.isValid(folderId)) {
                throw new BadRequestException('Invalid folder ID');
            }

            const folder = await this.folderRepository.findByIdAndOwner(folderId, userId);

            if (!folder) {
                throw new NotFoundException('Folder not found or access denied');
            }

            // Build path
            const path: any[] = [];
            let current: FolderDocument = folder;
            while (current.parentId) {
                const parent = await this.folderRepository.findById(current.parentId.toString());
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
            } as unknown as FolderResponseDto;
        } catch (error) {
            if (error instanceof BadRequestException || error instanceof NotFoundException) {
                throw error;
            }
            this.logger.error('Get folder error:', error);
            throw new InternalServerErrorException('Failed to get folder');
        }
    }

    /**
     * Create a new folder
     */
    async createFolder(userId: string, data: CreateFolderRequestDto): Promise<FolderResponseDto> {
        try {
            if (!data.name?.trim()) {
                throw new BadRequestException('Folder name is required');
            }

            if (!data.encryptedSessionKey) {
                throw new BadRequestException('Encrypted session key is required');
            }

            const folder = await this.folderRepository.create({
                ownerId: new Types.ObjectId(userId),
                name: data.name.trim(),
                parentId: data.parentId ? new Types.ObjectId(data.parentId) : null,
                encryptedSessionKey: data.encryptedSessionKey
            } as any);

            return folder as unknown as FolderResponseDto;
        } catch (error) {
            if (error instanceof BadRequestException) {
                throw error;
            }
            this.logger.error('Create folder error:', error);
            throw new InternalServerErrorException('Failed to create folder');
        }
    }

    /**
     * Update a folder (rename and/or change color)
     */
    async updateFolder(userId: string, folderId: string, data: UpdateFolderRequestDto): Promise<FolderResponseDto> {
        try {
            // Validate folderId
            if (!folderId || !Types.ObjectId.isValid(folderId)) {
                throw new BadRequestException('Invalid folder ID');
            }

            const update: Partial<FolderDocument> = {};

            if (data.name?.trim()) {
                update.name = data.name.trim();
            }
            if (data.color !== undefined) {
                update.color = data.color;
            }

            if (Object.keys(update).length === 0) {
                throw new BadRequestException('No valid fields to update');
            }

            const folder = await this.folderRepository.updateByIdAndOwner(folderId, userId, update);

            if (!folder) {
                throw new NotFoundException('Folder not found');
            }

            return folder as unknown as FolderResponseDto;
        } catch (error) {
            if (error instanceof BadRequestException || error instanceof NotFoundException) {
                throw error;
            }
            this.logger.error('Update folder error:', error);
            throw new InternalServerErrorException('Failed to update folder');
        }
    }

    /**
     * Delete a folder (only if empty)
     */
    async deleteFolder(userId: string, folderId: string): Promise<void> {
        try {
            // Validate folderId
            if (!folderId || !Types.ObjectId.isValid(folderId)) {
                throw new BadRequestException('Invalid folder ID');
            }

            // Check for files in the folder
            const filesCount = await this.vaultRepository.countFilesByFolder(folderId, userId);
            if (filesCount > 0) {
                throw new BadRequestException(
                    'Cannot delete folder with files. Move or delete files first.'
                );
            }

            // Check for subfolders
            const subfoldersCount = await this.folderRepository.countSubfolders(folderId, userId);
            if (subfoldersCount > 0) {
                throw new BadRequestException(
                    'Cannot delete folder with subfolders. Delete subfolders first.'
                );
            }

            // Delete the folder
            const deleted = await this.folderRepository.deleteByIdAndOwner(folderId, userId);
            if (!deleted) {
                throw new NotFoundException('Folder not found');
            }
        } catch (error) {
            if (error instanceof BadRequestException || error instanceof NotFoundException) {
                throw error;
            }
            this.logger.error('Delete folder error:', error);
            throw new InternalServerErrorException('Failed to delete folder');
        }
    }
}
