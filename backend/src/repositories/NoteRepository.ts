import mongoose from 'mongoose';
import { BaseRepository } from './base/BaseRepository';
import Note, { INote } from '../models/Note';
import { QueryOptions, SafeFilter } from './base/types';

/**
 * NoteRepository handles all Note-related database operations
 */
export class NoteRepository extends BaseRepository<INote> {
    constructor() {
        super(Note);
    }

    /**
     * Find all notes for a user with optional filters
     */
    async findByUserId(
        userId: string,
        filters?: { tags?: string[]; subject?: string; semester?: string; folderId?: string | null },
        options: QueryOptions = {}
    ): Promise<INote[]> {
        const filter: SafeFilter<INote> = {
            userId: { $eq: userId }
        };

        if (filters?.tags && filters.tags.length > 0) {
            (filter as any).tags = { $all: filters.tags };
        }

        if (filters?.subject) {
            (filter as any)['educationalContext.subject'] = { $eq: filters.subject };
        }

        if (filters?.semester) {
            (filter as any)['educationalContext.semester'] = { $eq: filters.semester };
        }

        // Filter by folder (null = root level)
        if (filters?.folderId !== undefined) {
            if (filters.folderId === null) {
                (filter as any).noteFolderId = { $eq: null };
            } else {
                (filter as any).noteFolderId = { $eq: new mongoose.Types.ObjectId(filters.folderId) };
            }
        }

        return this.findMany(filter, {
            sort: { updatedAt: -1 },
            ...options
        });
    }

    /**
     * Find notes by user with pagination
     */
    async findByUserIdPaginated(
        userId: string,
        options: { limit: number; cursor?: string; tags?: string[]; folderId?: string | null }
    ): Promise<{ items: INote[]; nextCursor: string | null }> {
        const filter: SafeFilter<INote> = {
            userId: { $eq: userId }
        };

        if (options.tags && options.tags.length > 0) {
            (filter as any).tags = { $all: options.tags };
        }

        // Filter by folder (null = root level)
        if (options.folderId !== undefined) {
            if (options.folderId === null) {
                (filter as any).noteFolderId = { $eq: null };
            } else {
                (filter as any).noteFolderId = { $eq: new mongoose.Types.ObjectId(options.folderId) };
            }
        }

        // Cursor-based pagination using _id
        if (options.cursor) {
            (filter as any)._id = { $lt: new mongoose.Types.ObjectId(options.cursor) };
        }

        const limit = Math.min(options.limit || 20, 100);
        const items = await this.findMany(filter, {
            sort: { _id: -1 },
            limit: limit + 1
        });

        let nextCursor: string | null = null;
        if (items.length > limit) {
            const lastItem = items.pop();
            nextCursor = lastItem?._id?.toString() || null;
        }

        return { items, nextCursor };
    }

    /**
     * Find notes by tags
     */
    async findByTags(userId: string, tags: string[]): Promise<INote[]> {
        return this.findMany({
            userId: { $eq: userId },
            tags: { $all: tags }
        } as unknown as SafeFilter<INote>, {
            sort: { updatedAt: -1 }
        });
    }

    /**
     * Find all notes that link to a specific entity ID
     */
    async findMentionsOf(userId: string, targetId: string): Promise<INote[]> {
        return this.findMany({
            userId: { $eq: userId },
            linkedEntityIds: { $in: [targetId] }
        } as unknown as SafeFilter<INote>);
    }

    /**
     * Find note by ID and verify ownership
     */
    async findByIdAndUser(noteId: string, userId: string): Promise<INote | null> {
        const validatedNoteId = this.validateId(noteId);
        const validatedUserId = this.validateId(userId);
        return this.findOne({
            _id: validatedNoteId,
            userId: { $eq: validatedUserId }
        } as SafeFilter<INote>);
    }

    /**
     * Update note and verify ownership
     */
    async updateByIdAndUser(
        noteId: string,
        userId: string,
        data: Partial<INote>
    ): Promise<INote | null> {
        const validatedNoteId = this.validateId(noteId);
        const validatedUserId = this.validateId(userId);
        return this.updateOne(
            {
                _id: validatedNoteId,
                userId: { $eq: validatedUserId }
            } as SafeFilter<INote>,
            { $set: data },
            { returnNew: true }
        );
    }

    /**
     * Delete note and verify ownership
     */
    async deleteByIdAndUser(noteId: string, userId: string): Promise<boolean> {
        const validatedNoteId = this.validateId(noteId);
        const validatedUserId = this.validateId(userId);
        return this.deleteOne({
            _id: validatedNoteId,
            userId: { $eq: validatedUserId }
        } as SafeFilter<INote>);
    }

    /**
     * Get all unique tags for a user
     */
    async getUniqueTags(userId: string): Promise<string[]> {
        const notes = await this.findMany({
            userId: { $eq: userId }
        }, {
            select: 'tags'
        });

        const tagSet = new Set<string>();
        notes.forEach(note => {
            note.tags?.forEach(tag => tagSet.add(tag));
        });

        return Array.from(tagSet).sort();
    }

    /**
     * Move all notes from multiple folders to root (when deleting folders)
     */
    async moveNotesToRoot(userId: string, folderIds: string[]): Promise<void> {
        if (folderIds.length === 0) return;

        await this.model.updateMany(
            {
                userId: new mongoose.Types.ObjectId(userId),
                noteFolderId: { $in: folderIds.map(id => new mongoose.Types.ObjectId(id)) }
            },
            { $set: { noteFolderId: null } }
        );
    }
}
