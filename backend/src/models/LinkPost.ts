import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IPreviewData {
    title?: string;
    description?: string;
    image?: string;
    favicon?: string;
    scrapeStatus?: 'success' | 'blocked' | 'failed';
}

export interface ILinkPost extends Document {
    collectionId: Types.ObjectId;
    userId: Types.ObjectId;
    url: string; // Plaintext for scraping
    previewData: IPreviewData;
    createdAt: Date;
}

const PreviewDataSchema = new Schema({
    title: { type: String, default: '' },
    description: { type: String, default: '' },
    image: { type: String, default: '' },
    favicon: { type: String, default: '' },
    scrapeStatus: { type: String, enum: ['success', 'blocked', 'failed', ''], default: '' }
}, { _id: false });

const LinkPostSchema: Schema = new Schema({
    collectionId: { type: Schema.Types.ObjectId, ref: 'Collection', required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    url: { type: String, required: true },
    previewData: { type: PreviewDataSchema, default: {} }
}, { timestamps: true });

// Index for efficient collection lookup
LinkPostSchema.index({ collectionId: 1, createdAt: -1 });

export default mongoose.model<ILinkPost>('LinkPost', LinkPostSchema);
