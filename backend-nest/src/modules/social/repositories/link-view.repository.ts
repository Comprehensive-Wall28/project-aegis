import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { BaseRepository } from '../../../common/repositories/base.repository';
import { LinkView, LinkViewDocument } from '../schemas/link-view.schema';
import { SafeFilter } from '../../../common/repositories/types';

@Injectable()
export class LinkViewRepository extends BaseRepository<LinkViewDocument> {
    constructor(
        @InjectModel(LinkView.name, 'primary')
        readonly linkViewModel: Model<LinkViewDocument>,
    ) {
        super(linkViewModel);
    }

    async deleteByRoom(roomId: string): Promise<number> {
        const validatedId = this.validateId(roomId);
        return this.deleteMany({
            roomId: { $eq: validatedId }
        } as unknown as SafeFilter<LinkViewDocument>);
    }
}
