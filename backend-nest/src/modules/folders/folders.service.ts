import { Injectable, Logger, BadRequestException, NotFoundException, ForbiddenException, InternalServerErrorException } from '@nestjs/common';
import { FolderRepository } from './repositories/folder.repository';
import { FolderResponseDto } from './dto/folder-response.dto';
import { Types } from 'mongoose';

@Injectable()
export class FoldersService {
    private readonly logger = new Logger(FoldersService.name);

    constructor(
        private readonly folderRepository: FolderRepository,
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
}
