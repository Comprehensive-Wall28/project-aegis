import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type NoteFolderDocument = NoteFolder & Document;

@Schema({ timestamps: true })
export class NoteFolder {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  userId!: Types.ObjectId;

  @Prop({ required: true })
  name!: string;

  @Prop({ type: Types.ObjectId, ref: 'NoteFolder', default: null, index: true })
  parentId?: Types.ObjectId;

  @Prop({ required: false })
  color?: string;
}

export const NoteFolderSchema = SchemaFactory.createForClass(NoteFolder);

// Compound indexes
NoteFolderSchema.index({ userId: 1, parentId: 1 });
NoteFolderSchema.index({ userId: 1, name: 1 });
