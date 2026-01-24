import mongoose, { Document, Schema } from 'mongoose';

export interface ICachedImage extends Document {
    url: string;
    fileId: mongoose.Types.ObjectId;
    contentType: string;
    size: number;
    lastFetched: Date;
}

export const CachedImageSchema: Schema = new Schema({
    url: { type: String, required: true, unique: true, index: true },
    fileId: { type: Schema.Types.ObjectId, required: true },
    contentType: { type: String, required: true },
    size: { type: Number, required: true },
    lastFetched: { type: Date, default: Date.now }
}, { timestamps: true });

// Cache for 30 days
CachedImageSchema.index({ lastFetched: 1 }, { expireAfterSeconds: 2592000 });

export default mongoose.model<ICachedImage>('CachedImage', CachedImageSchema);
