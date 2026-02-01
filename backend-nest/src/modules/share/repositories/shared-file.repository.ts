import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { SharedFile, SharedFileDocument } from '../schemas/shared-file.schema';
import { BaseRepository } from '../../../common/repositories/base.repository';

@Injectable()
export class SharedFileRepository extends BaseRepository<SharedFileDocument> {
    constructor(@InjectModel(SharedFile.name) private readonly sharedFileModel: Model<SharedFileDocument>) {
        super(sharedFileModel);
    }

    async findByFileAndUser(fileId: string, userId: string): Promise<SharedFileDocument | null> {
        return this.sharedFileModel.findOne({
            fileId: new Types.ObjectId(fileId),
            sharedWith: new Types.ObjectId(userId)
        } as any).exec();
    }
}
