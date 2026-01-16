import mongoose, { Document, Schema } from 'mongoose';

export interface ILinkMetadata extends Document {
    url: string;
    title: string;
    description: string;
    image: string;
    favicon: string;
    scrapeStatus: 'success' | 'blocked' | 'failed' | 'scraping';
    lastFetched: Date;
}

export const LinkMetadataSchema: Schema = new Schema({
    url: { type: String, required: true, unique: true, index: true },
    title: { type: String, default: '' },
    description: { type: String, default: '' },
    image: { type: String, default: '' },
    favicon: { type: String, default: '' },
    scrapeStatus: { type: String, enum: ['success', 'blocked', 'failed', 'scraping'], default: 'success' },
    lastFetched: { type: Date, default: Date.now }
}, { timestamps: true });

// Cache for 7 days
LinkMetadataSchema.index({ lastFetched: 1 }, { expireAfterSeconds: 604800 });

export default mongoose.model<ILinkMetadata>('LinkMetadata', LinkMetadataSchema);
