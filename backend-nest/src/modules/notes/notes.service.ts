import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { Readable } from 'stream';
import { NoteRepository } from './repositories/note.repository';
import { GridFsService } from '../vault/gridfs.service';
import { CreateNoteDTO, UpdateNoteContentDTO, UpdateNoteMetadataDTO } from './dto/note.dto';
import { AuditService } from '../../common/services/audit.service';
import { Request } from 'express';
import { Note } from './schemas/note.schema';
import { Types } from 'mongoose';

@Injectable()
export class NotesService {
    private readonly logger = new Logger(NotesService.name);

    constructor(
        private readonly noteRepository: NoteRepository,
        private readonly gridFsService: GridFsService,
        private readonly auditService: AuditService
    ) { }

    async create(userId: string, createDto: CreateNoteDTO, req?: Request): Promise<Note> {
        // Upload encrypted content to GridFS
        const contentBuffer = Buffer.from(createDto.encryptedContent, 'base64');
        const gridFsFileId = await this.gridFsService.uploadBuffer(
            contentBuffer,
            `note_${Date.now()}.enc`,
            { userId, type: 'note' }
        );

        const note = await this.noteRepository.create({
            userId: new Types.ObjectId(userId),
            encryptedTitle: createDto.encryptedTitle,
            noteFolderId: createDto.noteFolderId ? new Types.ObjectId(createDto.noteFolderId) : undefined,
            encapsulatedKey: createDto.encapsulatedKey,
            encryptedSymmetricKey: createDto.encryptedSymmetricKey,
            gridFsFileId,
            contentSize: contentBuffer.length,
            tags: createDto.tags || [],
            linkedEntityIds: createDto.linkedEntityIds || [],
            educationalContext: createDto.educationalContext,
            recordHash: createDto.recordHash
        });

        await this.auditService.logAuditEvent(
            userId,
            'NOTE_CREATE',
            'SUCCESS',
            req,
            { noteId: note._id }
        );

        return note;
    }

    async findAll(userId: string, filters?: any): Promise<Note[]> {
        return this.noteRepository.findByUserId(userId, filters);
    }

    async findOne(id: string, userId: string): Promise<Note> {
        const note = await this.noteRepository.findOne({ _id: id, userId });
        if (!note) throw new NotFoundException('Note not found');
        return note;
    }

    async getContent(id: string, userId: string): Promise<{ buffer: Buffer; note: Note }> {
        const note = await this.findOne(id, userId);
        const buffer = await this.gridFsService.downloadToBuffer(note.gridFsFileId);
        return { buffer, note };
    }

    async getContentStream(id: string, userId: string): Promise<{ stream: Readable; note: Note }> {
        const note = await this.findOne(id, userId);
        const stream = this.gridFsService.getFileStream(note.gridFsFileId);
        return { stream, note };
    }

    async getUserTags(userId: string): Promise<string[]> {
        return this.noteRepository.getUniqueTags(userId);
    }

    async getBacklinks(entityId: string, userId: string): Promise<Note[]> {
        return this.noteRepository.findMentionsOf(userId, entityId);
    }

    async updateMetadata(id: string, userId: string, updateDto: UpdateNoteMetadataDTO, req?: Request): Promise<Note> {
        const updateData: any = { ...updateDto };
        // Handle null folderId explicitly if needed
        if (updateDto.noteFolderId === null) {
            updateData.noteFolderId = null;
        }

        const updated = await this.noteRepository.updateOne(
            { _id: id, userId },
            updateData,
            { returnNew: true }
        );
        if (!updated) throw new NotFoundException('Note not found');

        await this.auditService.logAuditEvent(
            userId,
            'NOTE_UPDATE_METADATA',
            'SUCCESS',
            req,
            { noteId: id }
        );

        return updated;
    }

    async updateContent(id: string, userId: string, updateDto: UpdateNoteContentDTO, req?: Request): Promise<Note> {
        const note = await this.findOne(id, userId);
        const oldFileId = note.gridFsFileId;

        // Upload new content
        const contentBuffer = Buffer.from(updateDto.encryptedContent, 'base64');
        const newFileId = await this.gridFsService.uploadBuffer(
            contentBuffer,
            `note_${Date.now()}.enc`,
            { userId, type: 'note', version: Date.now() }
        );

        // Update note record
        const updated = await this.noteRepository.updateOne(
            { _id: id, userId },
            {
                gridFsFileId: newFileId,
                contentSize: contentBuffer.length,
                encapsulatedKey: updateDto.encapsulatedKey,
                encryptedSymmetricKey: updateDto.encryptedSymmetricKey,
                recordHash: updateDto.recordHash,
                ...(updateDto.encryptedTitle ? { encryptedTitle: updateDto.encryptedTitle } : {})
            },
            { returnNew: true }
        );

        if (!updated) {
            // Cleanup new file if update failed (unlikely if findOne succeeded)
            await this.gridFsService.deleteFile(newFileId);
            throw new NotFoundException('Note not found');
        }

        // Cleanup old file
        await this.gridFsService.deleteFile(oldFileId).catch(err =>
            this.logger.warn(`Failed to cleanup old GridFS file ${oldFileId}: ${err.message}`)
        );

        await this.auditService.logAuditEvent(
            userId,
            'NOTE_UPDATE_CONTENT',
            'SUCCESS',
            req,
            { noteId: id }
        );

        return updated;
    }

    async remove(id: string, userId: string, req?: Request): Promise<void> {
        const note = await this.findOne(id, userId);

        await this.noteRepository.deleteOne({ _id: id, userId });

        // Cleanup GridFS
        await this.gridFsService.deleteFile(note.gridFsFileId).catch(err =>
            this.logger.warn(`Failed to delete GridFS file ${note.gridFsFileId}: ${err.message}`)
        );

        await this.auditService.logAuditEvent(
            userId,
            'NOTE_DELETE',
            'SUCCESS',
            req,
            { noteId: id }
        );
    }
}
