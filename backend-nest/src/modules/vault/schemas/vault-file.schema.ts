import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export enum StorageProvider {
    GRIDFS = 'GRIDFS',
    GOOGLE_DRIVE = 'GOOGLE_DRIVE',
}

export enum FileStatus {
    PENDING = 'pending',
    UPLOADING = 'uploading',
    COMPLETED = 'completed',
    ERROR = 'error',
}

@Schema({ timestamps: true })
export class VaultFile {
    @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
    ownerId!: Types.ObjectId;

    @Prop({ type: Types.ObjectId, ref: 'Folder', default: null, index: true })
    folderId!: Types.ObjectId;

    @Prop({ required: true })
    fileName!: string;

    @Prop({ required: true })
    originalFileName!: string;

    @Prop({ required: true })
    fileSize!: number;

    @Prop({ required: true })
    mimeType!: string;

    // Client-side encryption metadata
    @Prop({ required: true })
    encryptedSymmetricKey!: string;

    @Prop({ required: true })
    encapsulatedKey!: string;

    // Storage provider details
    @Prop({ type: String, enum: StorageProvider, default: StorageProvider.GRIDFS })
    storageProvider!: StorageProvider;

    @Prop({ type: Types.ObjectId, ref: 'fs.files' })
    gridFsId?: Types.ObjectId; // If stored in GridFS

    @Prop()
    googleDriveFileId?: string; // If stored in Google Drive

    // Upload session tracking
    @Prop()
    uploadStreamId?: string;

    @Prop({ type: String, enum: FileStatus, default: FileStatus.PENDING })
    status!: FileStatus;
}

export type VaultFileDocument = VaultFile & Document;
export const VaultFileSchema = SchemaFactory.createForClass(VaultFile);
