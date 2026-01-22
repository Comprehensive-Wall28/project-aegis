import mongoose from 'mongoose';
import { Request } from 'express';
import { Readable } from 'stream';
import { BaseService, ServiceError } from './base/BaseService';
import { NoteRepository } from '../repositories/NoteRepository';
import { INote } from '../models/Note';
import {
    uploadBuffer,
    downloadToBuffer,
    deleteFile,
    getFileStream
} from './gridfsService';
import logger from '../utils/logger';

/**
 * DTO for creating a note
 */
export interface CreateNoteDTO {
    encapsulatedKey: string;
    encryptedSymmetricKey: string;
    encryptedContent: string;         // Base64 encoded encrypted content
    tags?: string[];
    linkedEntityIds?: string[];
    educationalContext?: {
        subject?: string;
        semester?: string;
    };
    recordHash: string;
}

/**
 * DTO for updating note metadata
 */
export interface UpdateNoteMetadataDTO {
    tags?: string[];
    linkedEntityIds?: string[];
    educationalContext?: {
        subject?: string;
        semester?: string;
    };
    recordHash?: string;
}

/**
 * DTO for updating note content
 */
export interface UpdateNoteContentDTO {
    encapsulatedKey: string;
    encryptedSymmetricKey: string;
    encryptedContent: string;         // Base64 encoded encrypted content
    recordHash: string;
}

/**
 * NoteService handles business logic for note operations with GridFS content storage
 */
export class NoteService extends BaseService<INote, NoteRepository> {
    constructor() {
        super(new NoteRepository());
    }

    /**
     * Get all notes for a user with optional filters
     */
    async getNotes(
        userId: string,
        filters?: { tags?: string[]; subject?: string; semester?: string }
    ): Promise<INote[]> {
        try {
            return await this.repository.findByUserId(userId, filters);
        } catch (error) {
            this.handleRepositoryError(error);
        }
    }

    /**
     * Get paginated notes for a user
     */
    async getNotesPaginated(
        userId: string,
        options: { limit: number; cursor?: string; tags?: string[] }
    ): Promise<{ items: INote[]; nextCursor: string | null }> {
        try {
            return await this.repository.findByUserIdPaginated(userId, {
                limit: Math.min(options.limit || 20, 100),
                cursor: options.cursor,
                tags: options.tags
            });
        } catch (error) {
            this.handleRepositoryError(error);
        }
    }

    /**
     * Get a single note by ID
     */
    async getNote(userId: string, noteId: string): Promise<INote> {
        try {
            const validatedId = this.validateId(noteId, 'note ID');
            const note = await this.repository.findByIdAndUser(validatedId, userId);

            if (!note) {
                throw new ServiceError('Note not found', 404, 'NOT_FOUND');
            }

            return note;
        } catch (error) {
            if (error instanceof ServiceError) throw error;
            this.handleRepositoryError(error);
        }
    }

    /**
     * Get note content stream from GridFS
     */
    async getNoteContentStream(userId: string, noteId: string): Promise<{ stream: Readable; note: INote }> {
        try {
            const note = await this.getNote(userId, noteId);
            const stream = getFileStream(note.gridFsFileId);
            return { stream, note };
        } catch (error) {
            if (error instanceof ServiceError) throw error;
            logger.error('Get note content error:', error);
            throw new ServiceError('Failed to get note content', 500);
        }
    }

    /**
     * Get note content as buffer (for smaller notes)
     */
    async getNoteContentBuffer(userId: string, noteId: string): Promise<{ content: Buffer; note: INote }> {
        try {
            const note = await this.getNote(userId, noteId);
            const content = await downloadToBuffer(note.gridFsFileId);
            return { content, note };
        } catch (error) {
            if (error instanceof ServiceError) throw error;
            logger.error('Get note content buffer error:', error);
            throw new ServiceError('Failed to get note content', 500);
        }
    }

    /**
     * Create a new note with encrypted content stored in GridFS
     */
    async createNote(
        userId: string,
        data: CreateNoteDTO,
        req: Request
    ): Promise<INote> {
        try {
            // Validate required fields
            this.validateRequired({
                encapsulatedKey: data.encapsulatedKey,
                encryptedSymmetricKey: data.encryptedSymmetricKey,
                encryptedContent: data.encryptedContent,
                recordHash: data.recordHash
            }, [
                'encapsulatedKey',
                'encryptedSymmetricKey',
                'encryptedContent',
                'recordHash'
            ]);

            // Decode base64 content to buffer
            const contentBuffer = Buffer.from(data.encryptedContent, 'base64');

            // Upload encrypted content to GridFS
            const gridFsFileId = await uploadBuffer(
                contentBuffer,
                `note_${Date.now()}.enc`,
                { userId, type: 'note' }
            );

            // Create note metadata record
            const note = await this.repository.create({
                userId: new mongoose.Types.ObjectId(userId),
                encapsulatedKey: data.encapsulatedKey,
                encryptedSymmetricKey: data.encryptedSymmetricKey,
                gridFsFileId,
                contentSize: contentBuffer.length,
                tags: data.tags || [],
                linkedEntityIds: data.linkedEntityIds || [],
                educationalContext: data.educationalContext,
                recordHash: data.recordHash
            } as Partial<INote>);

            // Audit log
            await this.logAction(userId, 'NOTE_CREATE', 'SUCCESS', req, {
                noteId: note._id.toString(),
                contentSize: contentBuffer.length
            });

            logger.info(`Note created: ${note._id} by user ${userId}`);
            return note;
        } catch (error) {
            if (error instanceof ServiceError) throw error;
            logger.error('Create note error:', error);
            this.handleRepositoryError(error);
        }
    }

    /**
     * Update note metadata (tags, links, context) - does not touch content
     */
    async updateNoteMetadata(
        userId: string,
        noteId: string,
        data: UpdateNoteMetadataDTO,
        req: Request
    ): Promise<INote> {
        try {
            const validatedId = this.validateId(noteId, 'note ID');

            const updateData: Partial<INote> = {};

            if (data.tags !== undefined) {
                updateData.tags = data.tags;
            }
            if (data.linkedEntityIds !== undefined) {
                updateData.linkedEntityIds = data.linkedEntityIds;
            }
            if (data.educationalContext !== undefined) {
                updateData.educationalContext = data.educationalContext;
            }
            if (data.recordHash) {
                updateData.recordHash = data.recordHash;
            }

            const note = await this.repository.updateByIdAndUser(validatedId, userId, updateData);

            if (!note) {
                throw new ServiceError('Note not found', 404, 'NOT_FOUND');
            }

            await this.logAction(userId, 'NOTE_UPDATE_METADATA', 'SUCCESS', req, {
                noteId: validatedId
            });

            return note;
        } catch (error) {
            if (error instanceof ServiceError) throw error;
            this.handleRepositoryError(error);
        }
    }

    /**
     * Update note content - creates new GridFS file and cleans up old one
     * This implements the versioning pattern: GridFS files are immutable
     */
    async updateNoteContent(
        userId: string,
        noteId: string,
        data: UpdateNoteContentDTO,
        req: Request
    ): Promise<INote> {
        try {
            const validatedId = this.validateId(noteId, 'note ID');

            // Get existing note
            const existingNote = await this.repository.findByIdAndUser(validatedId, userId);
            if (!existingNote) {
                throw new ServiceError('Note not found', 404, 'NOT_FOUND');
            }

            const oldGridFsId = existingNote.gridFsFileId;

            // Decode and upload new content
            const contentBuffer = Buffer.from(data.encryptedContent, 'base64');
            const newGridFsId = await uploadBuffer(
                contentBuffer,
                `note_${Date.now()}.enc`,
                { userId, type: 'note', version: Date.now() }
            );

            // Update note to point to new content
            const note = await this.repository.updateByIdAndUser(validatedId, userId, {
                encapsulatedKey: data.encapsulatedKey,
                encryptedSymmetricKey: data.encryptedSymmetricKey,
                gridFsFileId: newGridFsId,
                contentSize: contentBuffer.length,
                recordHash: data.recordHash
            });

            if (!note) {
                // Cleanup new file if update failed
                await deleteFile(newGridFsId).catch(err =>
                    logger.warn(`Failed to cleanup new GridFS file after failed update: ${err}`)
                );
                throw new ServiceError('Note not found', 404, 'NOT_FOUND');
            }

            // Async cleanup of old content (fire and forget)
            deleteFile(oldGridFsId).catch(err =>
                logger.warn(`Failed to cleanup old note content: ${err}`)
            );

            await this.logAction(userId, 'NOTE_UPDATE_CONTENT', 'SUCCESS', req, {
                noteId: validatedId,
                contentSize: contentBuffer.length
            });

            logger.info(`Note content updated: ${noteId} by user ${userId}`);
            return note;
        } catch (error) {
            if (error instanceof ServiceError) throw error;
            logger.error('Update note content error:', error);
            this.handleRepositoryError(error);
        }
    }

    /**
     * Delete a note and its GridFS content
     */
    async deleteNote(
        userId: string,
        noteId: string,
        req: Request
    ): Promise<void> {
        try {
            const validatedId = this.validateId(noteId, 'note ID');

            // Get note to find GridFS file ID
            const note = await this.repository.findByIdAndUser(validatedId, userId);
            if (!note) {
                throw new ServiceError('Note not found', 404, 'NOT_FOUND');
            }

            const gridFsFileId = note.gridFsFileId;

            // Delete note metadata
            const deleted = await this.repository.deleteByIdAndUser(validatedId, userId);
            if (!deleted) {
                throw new ServiceError('Note not found', 404, 'NOT_FOUND');
            }

            // Delete GridFS content (async, fire and forget)
            deleteFile(gridFsFileId).catch(err =>
                logger.warn(`Failed to delete note content from GridFS: ${err}`)
            );

            await this.logAction(userId, 'NOTE_DELETE', 'SUCCESS', req, {
                noteId: validatedId
            });

            logger.info(`Note deleted: ${noteId} by user ${userId}`);
        } catch (error) {
            if (error instanceof ServiceError) throw error;
            this.handleRepositoryError(error);
        }
    }

    /**
     * Get all unique tags for a user
     */
    async getUserTags(userId: string): Promise<string[]> {
        try {
            return await this.repository.getUniqueTags(userId);
        } catch (error) {
            this.handleRepositoryError(error);
        }
    }

    /**
     * Find notes that link to a specific entity
     */
    async getBacklinks(userId: string, entityId: string): Promise<INote[]> {
        try {
            return await this.repository.findMentionsOf(userId, entityId);
        } catch (error) {
            this.handleRepositoryError(error);
        }
    }
}
