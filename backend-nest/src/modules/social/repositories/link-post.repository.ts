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

    /**
     * Find links by collection with cursor-based pagination.
     * Uses createdAt + _id as a stable cursor for consistent pagination.
     */
    async findByCollectionCursor(
        collectionId: string,
        limit: number = 30,
        beforeCursor?: { createdAt: Date; id: string }
    ): Promise<{ links: LinkPostDocument[]; totalCount: number }> {
        const validatedCollectionId = new Types.ObjectId(this.validateId(collectionId));

        let query: any;
        if (beforeCursor) {
            const validatedCursorId = new Types.ObjectId(this.validateId(beforeCursor.id));
            query = {
                $and: [
                    { collectionId: { $eq: validatedCollectionId } },
                    {
                        $or: [
                            { createdAt: { $lt: beforeCursor.createdAt } },
                            { createdAt: { $eq: beforeCursor.createdAt }, _id: { $lt: validatedCursorId } }
                        ]
                    }
                ]
            };
        } else {
            query = { collectionId: { $eq: validatedCollectionId } };
        }

        const [links, totalCount] = await Promise.all([
            this.linkPostModel
                .find(query)
                .sort({ createdAt: -1, _id: -1 })
                .limit(limit)
                .populate({ path: 'userId', select: 'username' })
                .exec(),
            this.linkPostModel.countDocuments({ collectionId: { $eq: validatedCollectionId } })
        ]);

        return { links, totalCount };
    }
}
