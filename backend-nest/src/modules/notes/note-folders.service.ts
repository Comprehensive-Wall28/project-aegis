import { Injectable, BadRequestException, NotFoundException, ConflictException } from '@nestjs/common';
import { NoteFolderRepository } from './repositories/note-folder.repository';
import { NoteRepository } from './repositories/note.repository';
import { CreateFolderDTO } from './dto/note.dto';
import { NoteFolder } from './schemas/note-folder.schema';

@Injectable()
export class NoteFolderService {
    constructor(
        private readonly folderRepository: NoteFolderRepository,
        private readonly noteRepository: NoteRepository
    ) { }

    async create(userId: string, createDto: CreateFolderDTO): Promise<NoteFolder> {
        const { name, parentId, color } = createDto;

        // Check for duplicate name at same level
        const exists = await this.folderRepository.existsWithName(userId, name, parentId);
        if (exists) {
            throw new ConflictException('A folder with this name already exists');
        }

        return this.folderRepository.create({
            userId: userId as any,
            name,
            parentId: parentId as any,
            color
        });
    }

    async findAll(userId: string): Promise<NoteFolder[]> {
        return this.folderRepository.findByUserId(userId);
    }

    async findOne(id: string, userId: string): Promise<NoteFolder> {
        const folder = await this.folderRepository.findOne({ _id: id, userId });
        if (!folder) throw new NotFoundException('Folder not found');
        return folder;
    }

    async update(id: string, userId: string, updateDto: { name?: string; parentId?: string; color?: string }): Promise<NoteFolder> {
        // Check duplicate if name is changing
        if (updateDto.name) {
            // Need to know current parentId if not changing, to check duplicates correctly
            // But for simplicity, let's enforce check if provided
            // We really need the existing folder first
            const existing = await this.findOne(id, userId);
            const parentId = updateDto.parentId !== undefined ? updateDto.parentId : existing.parentId?.toString();

            const exists = await this.folderRepository.existsWithName(userId, updateDto.name, parentId, id);
            if (exists) {
                throw new ConflictException('A folder with this name already exists');
            }
        }

        const updated = await this.folderRepository.updateOne(
            { _id: id, userId },
            updateDto as any,
            { returnNew: true }
        );
        if (!updated) throw new NotFoundException('Folder not found');
        return updated;
    }

    async remove(id: string, userId: string): Promise<void> {
        // Check existence
        const folder = await this.findOne(id, userId);

        // Get all descendant IDs
        const descendants = await this.folderRepository.getDescendantIds(userId, id);
        const allIds = [id, ...descendants];

        // Move notes to root
        for (const folderId of allIds) {
            await this.noteRepository.moveNotesToRoot(userId, folderId);
        }

        // Delete folders
        // We can delete one by one or bulk. Bulk is better but BaseRepo doesn't have bulkDelete easily accessible without loop or complex filter.
        // Loop for now.
        // Delete validation is done by findOne above, assuming ownership holds for descendants (it should).
        // Actually getDescendantIds verifies userId too implicitly via aggregation match? No, needs robust check.
        // But since we are deleting, we can just deleteMany with { _id: { $in: allIds }, userId }
        // BaseRepository doesn't expose deleteMany with raw query easily, so let's use deleteById/One

        for (const folderId of allIds) {
            await this.folderRepository.deleteOne({ _id: folderId, userId });
        }
    }
}
