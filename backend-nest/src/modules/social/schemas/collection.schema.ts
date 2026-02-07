import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type CollectionDocument = Collection & Document;

@Schema({ timestamps: true })
export class Collection {
  @Prop({ type: Types.ObjectId, ref: 'Room', required: true })
  roomId: Types.ObjectId;

  @Prop({ default: '' })
  name: string;

  @Prop({ default: 0 })
  order: number;

  @Prop({ type: String, enum: ['links', 'discussion'], default: 'links' })
  type: 'links' | 'discussion';
}

export const CollectionSchema = SchemaFactory.createForClass(Collection);

CollectionSchema.index({ roomId: 1, order: 1 });
