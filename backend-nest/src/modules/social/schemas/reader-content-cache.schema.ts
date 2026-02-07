import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, HydratedDocument } from 'mongoose';

export type ReaderContentCacheDocument = HydratedDocument<ReaderContentCache>;

@Schema({ timestamps: true })
export class ReaderContentCache extends Document {
  @Prop({ required: true, unique: true, index: true })
  url: string;

  @Prop({ default: '' })
  title: string;

  @Prop({ type: String, default: null })
  byline: string | null;

  @Prop({ default: '' })
  content: string;

  @Prop({ default: '' })
  textContent: string;

  @Prop({ type: String, default: null })
  siteName: string | null;

  @Prop({
    type: String,
    enum: ['success', 'blocked', 'failed'],
    default: 'success',
  })
  status: 'success' | 'blocked' | 'failed';

  @Prop({ type: String })
  error?: string;

  @Prop({ type: Date, default: Date.now })
  lastFetched: Date;
}

export const ReaderContentCacheSchema =
  SchemaFactory.createForClass(ReaderContentCache);

// Cache for 30 days (reader content changes less often than previews)
ReaderContentCacheSchema.index(
  { lastFetched: 1 },
  { expireAfterSeconds: 2592000 },
);
