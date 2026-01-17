import mongoose, { Document, Schema, Types } from 'mongoose';

export interface ICollection extends Document {
    roomId: Types.ObjectId;
    name: string; // Encrypted
    order: number;
    type: 'links' | 'discussion';
}

const CollectionSchema: Schema = new Schema({
    roomId: { type: Schema.Types.ObjectId, ref: 'Room', required: true },
    name: { type: String, default: '' }, // Encrypted base64, optional for default collections
    order: { type: Number, default: 0 },
    type: { type: String, enum: ['links', 'discussion'], required: true }
}, { timestamps: true });

// Index for efficient room lookup and ordering
CollectionSchema.index({ roomId: 1, order: 1 });

export default mongoose.model<ICollection>('Collection', CollectionSchema);
