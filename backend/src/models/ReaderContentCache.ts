import mongoose, { Document, Schema } from 'mongoose';

export interface IReaderContentCache extends Document {
    url: string;
    title: string;
    byline: string | null;
    content: string;  // Cleaned HTML from Readability
    textContent: string;
    siteName: string | null;
    status: 'success' | 'blocked' | 'failed';
    error?: string;
    lastFetched: Date;
}

export const ReaderContentCacheSchema: Schema = new Schema({
    url: { type: String, required: true, unique: true, index: true },
    title: { type: String, default: '' },
    byline: { type: String, default: null },
    content: { type: String, default: '' },
    textContent: { type: String, default: '' },
    siteName: { type: String, default: null },
    status: { type: String, enum: ['success', 'blocked', 'failed'], default: 'success' },
    error: { type: String },
    lastFetched: { type: Date, default: Date.now }
}, { timestamps: true });

// Cache for 30 days (reader content changes less often than previews)
ReaderContentCacheSchema.index({ lastFetched: 1 }, { expireAfterSeconds: 2592000 });

export default mongoose.model<IReaderContentCache>('ReaderContentCache', ReaderContentCacheSchema);
