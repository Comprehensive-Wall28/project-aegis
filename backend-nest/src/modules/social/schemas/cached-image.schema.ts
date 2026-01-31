import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ timestamps: true })
export class CachedImage extends Document {
  @Prop({ required: true, unique: true, index: true })
  url!: string;

  @Prop({ type: Types.ObjectId, required: true })
  fileId!: Types.ObjectId;

  @Prop({ required: true })
  contentType!: string;

  @Prop({ required: true })
  size!: number;

  @Prop({ default: Date.now })
  lastFetched!: Date;

  @Prop()
  createdAt!: Date;

  @Prop()
  updatedAt!: Date;
}

export const CachedImageSchema = SchemaFactory.createForClass(CachedImage);

// Cache for 30 days
CachedImageSchema.index({ lastFetched: 1 }, { expireAfterSeconds: 2592000 });
