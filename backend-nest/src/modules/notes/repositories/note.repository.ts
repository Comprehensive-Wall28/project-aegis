import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { BaseRepository } from '../../../common/repositories/base.repository';
import { Note, NoteDocument } from '../schemas/note.schema';

@Injectable()
export class NoteRepository extends BaseRepository<NoteDocument> {
    constructor(@InjectModel(Note.name) model: Model<NoteDocument>) {
        super(model);
    }

    async findByUserId(userId: string, filters?: any): Promise<NoteDocument[]> {
        const query = { userId, ...filters };
        return this.model.find(query).sort({ updatedAt: -1 }).exec();
    }

    async findMentionsOf(userId: string, entityId: string): Promise<NoteDocument[]> {
        return this.model.find({ userId, linkedEntityIds: entityId }).exec();
    }

    async getUniqueTags(userId: string): Promise<string[]> {
        return this.model.distinct('tags', { userId }).exec();
    }

    async moveNotesToRoot(userId: string, folderId: string): Promise<void> {
        await this.model.updateMany(
            { userId, noteFolderId: folderId },
            { $set: { noteFolderId: null } }
        ).exec();
    }
}
