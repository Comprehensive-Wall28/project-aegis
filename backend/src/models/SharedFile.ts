import mongoose, { Document, Schema } from 'mongoose';

export interface ISharedFile extends Document {
    fileId: mongoose.Types.ObjectId;
    sharedBy: mongoose.Types.ObjectId;
    sharedWith: mongoose.Types.ObjectId;
    encryptedSharedKey: string;
    permissions: string[];
}

const SharedFileSchema: Schema = new Schema({
    fileId: { type: Schema.Types.ObjectId, ref: 'FileMetadata', required: true },
    sharedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    sharedWith: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    encryptedSharedKey: { type: String, required: true },
    permissions: { type: [String], default: ['READ', 'DOWNLOAD'] },
}, { timestamps: true });

// Compound index on fileId and sharedWith to prevent duplicate shares
SharedFileSchema.index({ fileId: 1, sharedWith: 1 }, { unique: true });
// Index on sharedWith for efficient retrieval of shared files
SharedFileSchema.index({ sharedWith: 1 });

export default mongoose.model<ISharedFile>('SharedFile', SharedFileSchema);
