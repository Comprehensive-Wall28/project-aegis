import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IComment extends Document {
    linkPostId: Types.ObjectId;
    userId: Types.ObjectId;
    content: string; // Encrypted with RoomKey
    createdAt: Date;
}

const CommentSchema: Schema = new Schema({
    linkPostId: { type: Schema.Types.ObjectId, ref: 'LinkPost', required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    content: { type: String, required: true } // Encrypted base64
}, { timestamps: true });

// Index for efficient link post lookup
CommentSchema.index({ linkPostId: 1, createdAt: -1 });

export default mongoose.model<IComment>('Comment', CommentSchema);
