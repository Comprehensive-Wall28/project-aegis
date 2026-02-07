import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type FileMetadataDocument = FileMetadata & Document;

@Schema({ timestamps: true })
export class FileMetadata {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  ownerId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Folder', default: null })
  folderId?: Types.ObjectId;

  @Prop()
  googleDriveFileId?: string;

  @Prop()
  uploadStreamId?: string;

  @Prop()
  uploadSessionUrl?: string;

  @Prop({ default: 0 })
  uploadOffset: number;

  @Prop({ required: true })
  fileName: string;

  @Prop({ required: true })
  originalFileName: string;

  @Prop({ required: true })
  fileSize: number;

  @Prop({ required: true })
  encapsulatedKey: string;

  @Prop({ required: true })
  encryptedSymmetricKey: string;

  @Prop({ required: true })
  mimeType: string;

  @Prop({
    type: String,
    enum: ['pending', 'uploading', 'completed', 'failed'],
    default: 'pending',
  })
  status: string;

  createdAt: Date;
  updatedAt: Date;
}

export const FileMetadataSchema = SchemaFactory.createForClass(FileMetadata);

FileMetadataSchema.index({ ownerId: 1, folderId: 1 });
