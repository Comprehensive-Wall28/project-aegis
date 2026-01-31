import { Injectable, NotFoundException, BadRequestException, ForbiddenException, Inject } from '@nestjs/common';
import { Types } from 'mongoose';
import { Folder, FolderDocument } from './schemas/folder.schema';
import { CreateFolderDto, UpdateFolderDto } from './dto/folder.dto';
import { BaseService } from '../../common/services/base.service';
import { FolderRepository } from './folders.repository';

@Injectable()
export class FoldersService extends BaseService<FolderDocument, FolderRepository> {
    constructor(
        private readonly folderRepository: FolderRepository,
    ) {
        super(folderRepository);
    }

    /**
     * Get folders for a user in a specific parent folder (or root)
     * TODO: Add shared folders logic (Phase 4)
     */
    async getFolders(userId: string, parentId?: string): Promise<any[]> {
        if (!parentId || parentId === 'null') {
            // Root folders
            const ownedFolders = await this.folderRepository.findMany({
                ownerId: new Types.ObjectId(userId),
                parentId: null,
            });

            // TODO: Fetch shared folders (Phase 4)
            return ownedFolders;
        }

        if (!Types.ObjectId.isValid(parentId)) {
            throw new BadRequestException('Invalid parent folder ID');
        }

        const parent = await this.folderRepository.findById(parentId);
        if (!parent) {
            throw new NotFoundException('Parent folder not found');
        }

        // Check access
        if (parent.ownerId.toString() !== userId) {
            // TODO: Check shared access (Phase 4)
            throw new ForbiddenException('Access denied');
        }

        const subfolders = await this.folderRepository.findMany({
            parentId: new Types.ObjectId(parentId),
            ownerId: new Types.ObjectId(userId), // Only own subfolders for now
        });

        return subfolders;
    }

    /**
     * Get single folder with path
     */
    async getFolder(userId: string, folderId: string): Promise<any> {
        if (!Types.ObjectId.isValid(folderId)) {
            throw new BadRequestException('Invalid folder ID');
        }

        const folder = await this.folderRepository.findOne({
            _id: folderId,
            ownerId: userId // Strict ownership check for now
        });

        if (!folder) {
            // TODO: Check shared access (Phase 4)
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

    async deleteFolder(userId: string, folderId: string): Promise<void> {
        const folder = await this.folderRepository.findOne({ _id: folderId, ownerId: userId });
        if (!folder) throw new NotFoundException('Folder not found');

        // Check for subfolders
        const subcount = await this.folderRepository.count({ parentId: folderId });
        if (subcount > 0) {
            throw new BadRequestException('Cannot delete folder with subfolders');
        }

        // TODO: Check for files (Phase 3 - Vault Module)

        await this.folderRepository.deleteById(folderId);
    }
}
