import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Collection, CollectionDocument } from './schemas/collection.schema';
import { BaseRepository } from '../../common/repositories/base.repository';

@Injectable()
export class CollectionRepository extends BaseRepository<CollectionDocument> {
    constructor(@InjectModel(Collection.name) private readonly collectionModel: Model<CollectionDocument>) {
        super(collectionModel);
    }

    async findByRoom(roomId: string): Promise<CollectionDocument[]> {
        return this.collectionModel.find({ roomId: roomId as any }).sort({ order: 1 }).exec();
    }

    async findDefaultLinksCollection(roomId: string): Promise<CollectionDocument | null> {
        return this.collectionModel.findOne({ roomId: roomId as any, type: 'links', name: '' }).exec();
    }

    async findByIdAndRoom(collectionId: string, roomId: string): Promise<CollectionDocument | null> {
        return this.collectionModel.findOne({ _id: collectionId, roomId: roomId as any }).exec();
    }

    async deleteByRoom(roomId: string): Promise<void> {
        await this.collectionModel.deleteMany({ roomId: roomId as any }).exec();
    }
}
