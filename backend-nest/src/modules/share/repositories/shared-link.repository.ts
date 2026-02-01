import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { SharedLink, SharedLinkDocument } from '../schemas/shared-link.schema';
import { BaseRepository } from '../../../common/repositories/base.repository';

@Injectable()
export class SharedLinkRepository extends BaseRepository<SharedLinkDocument> {
    constructor(@InjectModel(SharedLink.name) private readonly sharedLinkModel: Model<SharedLinkDocument>) {
        super(sharedLinkModel);
    }

    async findLinksByCreator(userId: string, skip: number, limit: number): Promise<{ links: SharedLinkDocument[]; total: number }> {
        const query = { creatorId: new Types.ObjectId(userId) } as any;

        const [links, total] = await Promise.all([
            this.sharedLinkModel.find(query).skip(skip).limit(limit).exec(),
            this.sharedLinkModel.countDocuments(query).exec()
        ]);

        return { links, total };
    }

    async findByToken(token: string): Promise<SharedLinkDocument | null> {
        return this.sharedLinkModel.findOne({ token }).exec();
    }

    async incrementViewCount(id: string): Promise<void> {
        await this.sharedLinkModel.updateOne(
            { _id: new Types.ObjectId(id) },
            { $inc: { views: 1 } }
        ).exec();
    }
}
