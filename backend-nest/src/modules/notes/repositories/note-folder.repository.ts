import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { BaseRepository } from '../../../common/repositories/base.repository';
import { NoteFolder, NoteFolderDocument } from '../schemas/note-folder.schema';

@Injectable()
export class NoteFolderRepository extends BaseRepository<NoteFolderDocument> {
    constructor(@InjectModel(NoteFolder.name) model: Model<NoteFolderDocument>) {
        super(model);
    }

    async findByUserId(userId: string): Promise<NoteFolderDocument[]> {
        return this.model.find({ userId }).sort({ name: 1 }).exec();
    }

    async existsWithName(userId: string, name: string, parentId?: string | null, excludeId?: string): Promise<boolean> {
        const query: any = { userId, name };
        if (parentId) {
            query.parentId = parentId;
        } else {
            query.parentId = null;
        }

        if (excludeId) {
            query._id = { $ne: excludeId };
        }

        return Boolean(await this.model.exists(query));
    }

    async getDescendantIds(userId: string, folderId: string): Promise<string[]> {
        // This requires recursive query or repeated queries. 
        // MongoDB $graphLookup is best here but for simplicity we might do simple recursion if depth is low
        // or just assume single level? No, folders are nested.
        // Use GraphLookup:
        const result = await this.model.aggregate([
            { $match: { _id: new this.model.base.Types.ObjectId(folderId) } },
            {
                $graphLookup: {
                    from: 'notefolders',
                    startWith: '$_id',
                    connectFromField: '_id',
                    connectToField: 'parentId',
                    as: 'descendants'
                }
            },
            { $project: { descendants: 1 } }
        ]);

        if (!result[0] || !result[0].descendants) return [];
        return result[0].descendants.map((d: any) => d._id.toString());
    }
}
