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

    /**
     * Find viewed link IDs for a user within a set of links.
     */
    async findViewedLinkIds(userId: string, linkIds: string[]): Promise<string[]> {
        if (linkIds.length === 0) return [];

        const validatedUserId = new Types.ObjectId(this.validateId(userId));
        const validatedLinkIds = linkIds.map(id => new Types.ObjectId(this.validateId(id)));

        const views = await this.linkViewModel.find({
            userId: { $eq: validatedUserId },
            linkId: { $in: validatedLinkIds }
        }).select('linkId').lean().exec();

        return views.map(v => v.linkId.toString());
    }
}
