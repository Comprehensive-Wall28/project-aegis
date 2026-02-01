import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { BaseRepository } from '../../../common/repositories/base.repository';
import { QuerySanitizer } from '../../../common/repositories/QuerySanitizer';
import { Note, NoteDocument } from '../schemas/note.schema';

@Injectable()
export class NoteRepository extends BaseRepository<NoteDocument> {
  constructor(@InjectModel(Note.name) model: Model<NoteDocument>) {
    super(model);
  }

  async findByUserId(userId: string, filters?: any): Promise<NoteDocument[]> {
    return this.findMany({ userId, ...filters }, { sort: { updatedAt: -1 } });
  }

  async findMentionsOf(
    userId: string,
    entityId: string,
  ): Promise<NoteDocument[]> {
    return this.findMany({
      userId,
      linkedEntityIds: { $in: [entityId] },
    } as any);
  }

  async getUniqueTags(userId: string): Promise<string[]> {
    // BaseRepository doesn't have distinct yet, but QuerySanitizer can be used manually
    const sanitizedFilter = QuerySanitizer.sanitizeQuery({ userId });
    return this.model.distinct('tags', sanitizedFilter as any).exec();
  }

  async moveNotesToRoot(userId: string, folderId: string): Promise<void> {
    await this.updateMany(
      { userId, noteFolderId: folderId },
      { $set: { noteFolderId: null } },
    );
  }
}
