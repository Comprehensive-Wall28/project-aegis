import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { BaseRepository } from '../../../common/repositories/base.repository';
import { LinkPost, LinkPostDocument } from '../schemas/link-post.schema';
import { SafeFilter } from '../../../common/repositories/types';

@Injectable()
export class LinkPostRepository extends BaseRepository<LinkPostDocument> {
    constructor(
        @InjectModel(LinkPost.name, 'primary')
        readonly linkPostModel: Model<LinkPostDocument>,
    ) {
        super(linkPostModel);
    }

    async findByCollections(collectionIds: string[]): Promise<LinkPostDocument[]> {
        const validatedIds = collectionIds.map(id => this.validateId(id));
        return this.findMany({
            collectionId: { $in: validatedIds }
        } as unknown as SafeFilter<LinkPostDocument>);
    }

    async deleteByCollection(collectionId: string): Promise<number> {
        const validatedId = this.validateId(collectionId);
        return this.deleteMany({
            collectionId: { $eq: validatedId }
        } as unknown as SafeFilter<LinkPostDocument>);
    }
}
