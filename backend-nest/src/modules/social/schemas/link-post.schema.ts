import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export class PreviewData {
  @Prop({ default: '' })
  title?: string;

  @Prop({ default: '' })
  description?: string;

  @Prop({ default: '' })
  image?: string;

  @Prop({ default: '' })
  favicon?: string;

  @Prop({
    type: String,
    enum: ['success', 'blocked', 'failed', 'scraping', ''],
    default: '',
  })
  scrapeStatus?: 'success' | 'blocked' | 'failed' | 'scraping' | '';
}

@Schema({ timestamps: true })
export class LinkPost extends Document {
  @Prop({
    type: Types.ObjectId,
    ref: 'Collection',
    required: true,
    index: true,
  })
  collectionId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId!: Types.ObjectId;

  @Prop({ required: true })
  url!: string;

  @Prop({ type: PreviewData, default: {} })
  previewData!: PreviewData;

  @Prop()
  createdAt!: Date;

  @Prop()
  updatedAt!: Date;
}

export const LinkPostSchema = SchemaFactory.createForClass(LinkPost);

// Index for efficient collection lookup with cursor pagination
LinkPostSchema.index({ collectionId: 1, createdAt: -1 });
