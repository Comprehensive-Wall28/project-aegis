import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { BaseRepository } from '../../../common/repositories/base.repository';
import { FileMetadata, FileMetadataDocument } from '../schemas/file-metadata.schema';

@Injectable()
export class VaultRepository extends BaseRepository<FileMetadataDocument> {
    constructor(
        @InjectModel(FileMetadata.name, 'primary')
        readonly fileMetadataModel: Model<FileMetadataDocument>,
    ) {
        super(fileMetadataModel);
    }

    async findByIdAndOwner(id: string, ownerId: string): Promise<FileMetadataDocument | null> {
        return await this.findOne({
            _id: id as any,
            ownerId: ownerId as any,
        });
    }

    async updateUploadStatus(id: string, status: string): Promise<void> {
        await this.updateById(id, { status } as any);
    }

    async completeUpload(id: string, googleDriveFileId: string): Promise<void> {
        await this.updateById(id, {
            status: 'completed',
            googleDriveFileId,
        } as any);
    }

    async findByIdAndStream(id: string, ownerId: string): Promise<FileMetadataDocument | null> {
        return await this.findOne({
            _id: id as any,
            ownerId: ownerId as any,
        });
    }
}
