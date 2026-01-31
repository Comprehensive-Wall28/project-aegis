import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class ReaderContentCache extends Document {
    @Prop({ required: true, unique: true, index: true })
    url!: string;

    @Prop({ default: '' })
    title!: string;

    @Prop({ default: null })
    byline!: string;

    @Prop({ default: '' })
    content!: string;

    @Prop({ default: '' })
    textContent!: string;

    @Prop({ default: null })
    siteName!: string;

    @Prop({ type: String, enum: ['success', 'blocked', 'failed'], default: 'success' })
    status!: string;

    @Prop()
    error!: string;

    @Prop({ default: Date.now })
    lastFetched!: Date;
}

export const ReaderContentCacheSchema = SchemaFactory.createForClass(ReaderContentCache);

// Cache for 30 days (reader content changes less often than previews)
ReaderContentCacheSchema.index({ lastFetched: 1 }, { expireAfterSeconds: 2592000 });
