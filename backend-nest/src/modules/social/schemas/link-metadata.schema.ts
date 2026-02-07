import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, HydratedDocument } from 'mongoose';

export type LinkMetadataDocument = HydratedDocument<LinkMetadata>;

@Schema({ timestamps: true })
export class LinkMetadata extends Document {
  @Prop({ required: true, unique: true, index: true })
  url: string;

  @Prop({ default: '' })
  title: string;

  @Prop({ default: '' })
  description: string;

  @Prop({ default: '' })
  image: string;

  @Prop({ default: '' })
  favicon: string;

  @Prop({
    type: String,
    enum: ['success', 'blocked', 'failed', 'scraping'],
    default: 'success',
  })
  scrapeStatus: 'success' | 'blocked' | 'failed' | 'scraping';

  @Prop({ type: Date, default: Date.now })
  lastFetched: Date;
}

export const LinkMetadataSchema = SchemaFactory.createForClass(LinkMetadata);

// Cache for 7 days
LinkMetadataSchema.index({ lastFetched: 1 }, { expireAfterSeconds: 604800 });
