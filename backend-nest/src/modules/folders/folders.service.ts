import { Injectable, NotFoundException, BadRequestException, ForbiddenException, Inject, forwardRef } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Folder, FolderDocument } from './schemas/folder.schema';
import { SharedFolder, SharedFolderDocument } from './schemas/shared-folder.schema';
import { CreateFolderDto, UpdateFolderDto, MoveFilesDto } from './dto/folder.dto';
import { BaseService, ServiceError } from '../../common/services/base.service';
import { FolderRepository } from './folders.repository';
import { VaultService } from '../vault/vault.service';

@Injectable()
export class FoldersService extends BaseService<FolderDocument, FolderRepository> {
    constructor(
        private readonly folderRepository: FolderRepository,
        @InjectModel(SharedFolder.name) private readonly sharedFolderModel: Model<SharedFolderDocument>,
        @Inject(forwardRef(() => VaultService)) private readonly vaultService: VaultService,
    ) {
        super(folderRepository);
    }

    /**
     * Get folders for a user in a specific parent folder (or root)
     */
    async getFolders(userId: string, parentId?: string): Promise<any[]> {
        // Normalize parentId
        let normalizedParentId: string | null = null;
        if (parentId && parentId !== 'null' && parentId !== '') {
            normalizedParentId = parentId;
        }

        if (normalizedParentId === null) {
            // Root level: owned folders + shared folders
            const ownedFolders = await this.folderRepository.findMany({
                ownerId: new Types.ObjectId(userId),
                parentId: null,
            });

            const sharedFolderEntries = await this.sharedFolderModel.find({ sharedWith: new Types.ObjectId(userId) })
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
        if (!Types.ObjectId.isValid(normalizedParentId)) {
            throw new BadRequestException('Invalid folder ID format');
        }

        const parentFolder = await this.folderRepository.findById(normalizedParentId);
        if (!parentFolder) {
            throw new NotFoundException('Parent folder not found');
        }

        const isOwner = parentFolder.ownerId.toString() === userId;
        let hasAccess = isOwner;

        if (!hasAccess) {
            hasAccess = await this.checkSharedAccess(normalizedParentId, userId, parentFolder);
        }

        if (!hasAccess) {
            throw new ForbiddenException('Access denied');
        }

        // Fetch subfolders owned by folder's owner
        const subfolders = await this.folderRepository.findMany({
            parentId: new Types.ObjectId(normalizedParentId),
            ownerId: parentFolder.ownerId,
        });

        // Mark as shared if not owner
        if (!isOwner) {
            return subfolders.map(f => ({
                ...f.toObject(),
                isSharedWithMe: true
            }));
        }

        return subfolders;
    }

    /**
     * Get single folder with path
     */
    async getFolder(userId: string, folderId: string): Promise<any> {
        if (!Types.ObjectId.isValid(folderId)) {
            throw new BadRequestException('Invalid folder ID');
        }

        let folder = await this.folderRepository.findOne({
            _id: folderId,
            ownerId: userId
        });

        if (!folder) {
            // Check direct shared access
            const isShared = await this.sharedFolderModel.findOne({
                folderId: new Types.ObjectId(folderId),
                sharedWith: new Types.ObjectId(userId)
            });
            if (isShared) {
                folder = await this.folderRepository.findById(folderId);
            }
        }

        if (!folder) {
            // Check ancestor shared access
            const targetFolder = await this.folderRepository.findById(folderId);
            if (targetFolder) {
                const hasAccess = await this.checkSharedAccess(folderId, userId, targetFolder);
                if (hasAccess) {
                    folder = targetFolder;
                }
            }
        }

        if (!folder) {
            throw new NotFoundException('Folder not found or access denied');
        }

        // Build path
        const path: any[] = [];
        let current: any = folder;

        // Safety limit to prevent infinite loops in cyclic graphs
        let depth = 0;
        while (current.parentId && depth < 20) {
            const parent = await this.folderRepository.findById(current.parentId.toString());
            if (!parent) break;

            path.unshift({
                _id: parent._id,
                name: parent.name,
                parentId: parent.parentId
            });
            current = parent;
            depth++;
        }

        return {
            ...folder.toObject(),
            path
        };
    }

    async createFolder(userId: string, createFolderDto: CreateFolderDto): Promise<Folder> {
        const { parentId, ...rest } = createFolderDto;

        // Verify parent if exists
        if (parentId) {
            if (!Types.ObjectId.isValid(parentId)) {
                throw new BadRequestException('Invalid parent folder ID');
            }
            const parent = await this.folderRepository.findById(parentId);
            if (!parent) throw new NotFoundException('Parent folder not found');
            if (parent.ownerId.toString() !== userId) throw new ForbiddenException('Cannot create subfolder in non-owned folder');
        }

        return this.repository.create({
            ...rest,
            ownerId: new Types.ObjectId(userId),
            parentId: parentId ? new Types.ObjectId(parentId) : null,
        } as any);
    }

    async updateFolder(userId: string, folderId: string, updateFolderDto: UpdateFolderDto): Promise<Folder> {
        // Validate existence and ownership
        const folder = await this.folderRepository.findOne({ _id: folderId, ownerId: userId });
        if (!folder) throw new NotFoundException('Folder not found');

        const update: any = {};
        if (updateFolderDto.name) update.name = updateFolderDto.name;
        if (updateFolderDto.color !== undefined) update.color = updateFolderDto.color;

        const updated = await this.folderRepository.updateById(folderId, update);
        if (!updated) throw new NotFoundException('Folder not found');
        return updated;
    }

    async findById(id: string): Promise<FolderDocument> {
        const folder = await this.folderRepository.findById(id);
        if (!folder) {
            throw new ServiceError('Folder not found', 404);
        }
        return folder;
    }

    async checkAccess(userId: string, folderId: string): Promise<boolean> {
        try {
            const folder = await this.folderRepository.findById(folderId);
            if (!folder) return false;

            // Check ownership
            if (folder.ownerId.toString() === userId) return true;

            // Check shared access
            return await this.checkSharedAccess(folderId, userId, folder);
        } catch (e) {
            return false;
        }
    }

    async deleteFolder(userId: string, folderId: string): Promise<void> {
        const folder = await this.folderRepository.findOne({ _id: folderId, ownerId: userId });
        if (!folder) throw new NotFoundException('Folder not found');

        // Check for subfolders
        const subcount = await this.folderRepository.count({ parentId: folderId });
        if (subcount > 0) {
            throw new BadRequestException('Cannot delete folder with subfolders. Delete subfolders first.');
        }

        // Check for files
        const fileCount = await this.vaultService.countFiles(userId, folderId);
        if (fileCount > 0) {
            throw new BadRequestException('Cannot delete folder with files. Move or delete files first.');
        }

        await this.folderRepository.deleteById(folderId);
    }

    /**
     * Move files to a folder
     */
    async moveFiles(userId: string, moveFilesDto: MoveFilesDto): Promise<number> {
        const { updates, folderId } = moveFilesDto;

        if (!updates || !Array.isArray(updates) || updates.length === 0) {
            throw new BadRequestException('File updates are required');
        }

        // Normalize folderId
        let normalizedFolderId: string | null = null;
        if (folderId && folderId !== '' && folderId !== 'root') {
            normalizedFolderId = folderId;

            // Validate folder exists and user has access
            const hasAccess = await this.checkAccess(userId, normalizedFolderId);
            if (!hasAccess) {
                throw new NotFoundException('Target folder not found or access denied');
            }
        }

        // Perform bulk move via VaultService
        return this.vaultService.bulkMoveFiles(userId, updates, normalizedFolderId);
    }

    /**
     * Check if user has shared access to a folder (direct or ancestor)
     */
    private async checkSharedAccess(
        folderId: string,
        userId: string,
        folder: FolderDocument
    ): Promise<boolean> {
        // Check direct share
        const directShare = await this.sharedFolderModel.findOne({
            folderId: new Types.ObjectId(folderId),
            sharedWith: new Types.ObjectId(userId)
        });
        if (directShare) {
            return true;
        }

        // Check ancestors
        let current = folder;
        let depth = 0;
        while (current.parentId && depth < 20) {
            const ancestorShare = await this.sharedFolderModel.findOne({
                folderId: current.parentId,
                sharedWith: new Types.ObjectId(userId)
            });
            if (ancestorShare) {
                return true;
            }
            const parent = await this.folderRepository.findById(current.parentId.toString());
            if (!parent) break;
            current = parent;
            depth++;
        }

        return false;
    }
}
