import mongoose, { Document, Schema, Types } from 'mongoose';

export interface ILinkComment extends Document {
    linkId: Types.ObjectId;
    userId: Types.ObjectId;
    encryptedContent: string;  // Encrypted with room key
    createdAt: Date;
}

const LinkCommentSchema: Schema = new Schema({
    linkId: { type: Schema.Types.ObjectId, ref: 'LinkPost', required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    encryptedContent: { type: String, required: true }
}, { timestamps: true });

// Index for efficient lookup of comments by link
LinkCommentSchema.index({ linkId: 1, createdAt: -1 });

export default mongoose.model<ILinkComment>('LinkComment', LinkCommentSchema);
