import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { BaseRepository } from '../../../common/repositories/base.repository';
import { FileMetadata, FileMetadataDocument } from '../schemas/file-metadata.schema';
import { SafeFilter } from '../../../common/repositories/types';
import { escapeRegex } from '../../../common/utils/regex-utils';

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

    async findByOwnerAndFolder(
        ownerId: string,
        folderId: string | null,
        search?: string,
    ): Promise<FileMetadataDocument[]> {
        const filter: SafeFilter<FileMetadataDocument> = {
            ownerId: new Types.ObjectId(ownerId) as any,
        };

        if (search) {
            (filter as any).originalFileName = { $regex: escapeRegex(search), $options: 'i' };
            // Global search ignores folderId
        } else if (folderId && folderId !== 'null') {
            filter.folderId = new Types.ObjectId(folderId) as any;
        } else {
            filter.folderId = null;
        }

        return this.findMany(filter, {
            sort: { createdAt: -1 },
        });
    }

    async findByOwnerAndFolderPaginated(
        ownerId: string,
        folderId: string | null,
        options: { limit: number; cursor?: string; search?: string },
    ): Promise<{ items: FileMetadataDocument[]; nextCursor: string | null }> {
        const filter: SafeFilter<FileMetadataDocument> = {
            ownerId: new Types.ObjectId(ownerId) as any,
        };

        if (options.search) {
            (filter as any).originalFileName = { $regex: escapeRegex(options.search), $options: 'i' };
            // Global search ignores folderId
        } else if (folderId && folderId !== 'null') {
            filter.folderId = new Types.ObjectId(folderId) as any;
        } else {
            filter.folderId = null;
        }

        if (options.cursor) {
            const [timestamp, id] = options.cursor.split('_');
            if (timestamp && id) {
                const tsDate = new Date(parseInt(timestamp));
                filter.$or = [
                    { createdAt: { $lt: tsDate } } as any,
                    {
                        $and: [
                            { createdAt: tsDate },
                            { _id: { $lt: new Types.ObjectId(id) } },
                        ],
                    } as any,
                ];
            }
        }

        const items = await this.model
            .find(filter as any)
            .sort({ createdAt: -1, _id: -1 })
            .limit(options.limit)
            .exec();

        let nextCursor: string | null = null;
        if (items.length === options.limit) {
            const lastItem = items[items.length - 1];
            nextCursor = `${lastItem.createdAt.getTime()}_${lastItem._id}`;
        }

        return { items, nextCursor };
    }
}
