import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ timestamps: true })
export class Folder {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  ownerId!: Types.ObjectId;

  @Prop({ required: true })
  name!: string;

  @Prop({ type: Types.ObjectId, ref: 'Folder', default: null })
  parentId!: Types.ObjectId;

  @Prop({ required: true })
  encryptedSessionKey!: string;

  @Prop({ default: false })
  isShared!: boolean;

  @Prop({ required: false })
  color!: string;

  createdAt!: Date;
  updatedAt!: Date;
}

export type FolderDocument = Folder & Document;
export const FolderSchema = SchemaFactory.createForClass(Folder);

// Compound index for efficient queries matches existing backend
FolderSchema.index({ ownerId: 1, parentId: 1 });
