import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ timestamps: true })
export class SharedFolder {
  @Prop({ type: Types.ObjectId, ref: 'Folder', required: true })
  folderId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  sharedBy!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  sharedWith!: Types.ObjectId;

  @Prop({ required: true })
  encryptedSharedKey!: string;

  @Prop({ type: [String], default: ['READ', 'DOWNLOAD'] })
  permissions!: string[];
}

export type SharedFolderDocument = SharedFolder & Document;
export const SharedFolderSchema = SchemaFactory.createForClass(SharedFolder);

SharedFolderSchema.index({ folderId: 1, sharedWith: 1 }, { unique: true });
SharedFolderSchema.index({ sharedWith: 1 });
