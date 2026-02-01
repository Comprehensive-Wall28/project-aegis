import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { BaseRepository } from '../../common/repositories/base.repository';
import {
  VaultFile,
  VaultFileDocument,
  FileStatus,
} from './schemas/vault-file.schema';
import { escapeRegex } from '../../common/utils/regex.utils';

@Injectable()
export class VaultRepository extends BaseRepository<VaultFileDocument> {
  constructor(@InjectModel(VaultFile.name) model: Model<VaultFileDocument>) {
    super(model);
  }

  async findByIdAndOwner(
    fileId: string,
    ownerId: string,
  ): Promise<VaultFileDocument | null> {
    return this.findOne({
      _id: new Types.ObjectId(fileId),
      ownerId: new Types.ObjectId(ownerId),
    } as any);
  }

  async findByIdAndStream(
    fileId: string,
    ownerId: string,
  ): Promise<VaultFileDocument | null> {
    const file = await this.findOne({
      _id: new Types.ObjectId(fileId),
      ownerId: new Types.ObjectId(ownerId),
    } as any);

    return file?.uploadStreamId ? file : null;
  }

  async findByOwnerAndFolder(
    ownerId: string,
    folderId: string | null,
    search?: string,
  ): Promise<VaultFileDocument[]> {
    const filter: any = {
      ownerId: new Types.ObjectId(ownerId),
    };

    if (search) {
      filter.originalFileName = { $regex: escapeRegex(search), $options: 'i' };
    } else if (folderId && folderId !== 'root') {
      filter.folderId = new Types.ObjectId(folderId);
    } else {
      filter.folderId = null;
    }

    return this.findMany(filter, { sort: { createdAt: -1 } });
  }

  async findByFolderAndFolderOwner(
    folderId: string,
    folderOwnerId: string,
  ): Promise<VaultFileDocument[]> {
    return this.findMany(
      {
        folderId: new Types.ObjectId(folderId),
        ownerId: new Types.ObjectId(folderOwnerId),
      } as any,
      { sort: { createdAt: -1 } },
    );
  }

  async updateUploadStatus(
    fileId: string,
    status: FileStatus,
  ): Promise<VaultFileDocument | null> {
    return this.updateById(fileId, { $set: { status } });
  }

  async completeUpload(
    fileId: string,
    googleDriveFileId: string,
  ): Promise<VaultFileDocument | null> {
    return this.updateById(fileId, {
      $set: {
        googleDriveFileId,
        status: FileStatus.COMPLETED,
      },
      $unset: { uploadStreamId: 1 },
    });
  }

  async deleteByIdAndOwner(fileId: string, ownerId: string): Promise<boolean> {
    const result = await this.model
      .deleteOne({
        _id: new Types.ObjectId(fileId),
        ownerId: new Types.ObjectId(ownerId),
      })
      .exec();
    return result.deletedCount > 0;
  }

  async bulkMoveFiles(
    updates: {
      fileId: string;
      encryptedKey: string;
      encapsulatedKey: string;
      folderId: string | null;
    }[],
    ownerId: string,
  ): Promise<number> {
    if (updates.length === 0) return 0;

    const operations: any[] = updates.map((update) => ({
      updateOne: {
        filter: {
          _id: new Types.ObjectId(update.fileId),
          ownerId: new Types.ObjectId(ownerId),
        },
        update: {
          $set: {
            encryptedSymmetricKey: update.encryptedKey,
            encapsulatedKey: update.encapsulatedKey,
            folderId: update.folderId
              ? new Types.ObjectId(update.folderId)
              : null,
          },
        },
      },
    }));

    const result = await this.bulkWrite(operations);
    return result.modifiedCount || 0;
  }

  async findByOwnerAndFolderPaginated(
    ownerId: string,
    folderId: string | null,
    options: { limit: number; cursor?: string; search?: string },
  ): Promise<{ items: VaultFileDocument[]; nextCursor: string | null }> {
    const filter: any = {
      ownerId: new Types.ObjectId(ownerId),
    };

    if (options.search) {
      filter.originalFileName = {
        $regex: escapeRegex(options.search),
        $options: 'i',
      };
    } else if (folderId && folderId !== 'root') {
      filter.folderId = new Types.ObjectId(folderId);
    } else {
      filter.folderId = null;
    }

    return this.findPaginated(filter, {
      limit: Math.min(options.limit || 20, 100),
      cursor: options.cursor,
      sortField: 'createdAt',
      sortOrder: -1,
    });
  }
}
