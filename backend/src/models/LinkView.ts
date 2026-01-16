import mongoose, { Document, Schema, Types } from 'mongoose';

export interface ILinkView extends Document {
    linkId: Types.ObjectId;
    userId: Types.ObjectId;
    collectionId?: Types.ObjectId;
    roomId?: Types.ObjectId;
    viewedAt: Date;
}

export const LinkViewSchema: Schema = new Schema({
    linkId: { type: Schema.Types.ObjectId, ref: 'LinkPost', required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    collectionId: { type: Schema.Types.ObjectId, ref: 'Collection' },
    roomId: { type: Schema.Types.ObjectId, ref: 'Room' },
    viewedAt: { type: Date, default: Date.now }
});

// Compound unique index to prevent duplicate views
LinkViewSchema.index({ linkId: 1, userId: 1 }, { unique: true });

// Index for efficient lookup of all views by a user
LinkViewSchema.index({ userId: 1 });

// Index for room-wide unviewed count aggregation
LinkViewSchema.index({ roomId: 1, userId: 1, collectionId: 1 });

export default mongoose.model<ILinkView>('LinkView', LinkViewSchema);
