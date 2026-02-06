import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { BaseRepository } from '../../../common/repositories/base.repository';
import { ReaderAnnotation, ReaderAnnotationDocument } from '../schemas/reader-annotation.schema';
import { SafeFilter } from '../../../common/repositories/types';

@Injectable()
export class ReaderAnnotationRepository extends BaseRepository<ReaderAnnotationDocument> {
    constructor(
        @InjectModel(ReaderAnnotation.name, 'primary')
        readonly readerAnnotationModel: Model<ReaderAnnotationDocument>,
    ) {
        super(readerAnnotationModel);
    }

    async deleteByRoom(roomId: string): Promise<number> {
        const validatedId = this.validateId(roomId);
        return this.deleteMany({
            roomId: { $eq: validatedId }
        } as unknown as SafeFilter<ReaderAnnotationDocument>);
    }
}
