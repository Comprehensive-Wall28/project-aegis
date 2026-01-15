import mongoose, { Document, Schema } from 'mongoose';

export interface ISharedFolder extends Document {
    folderId: mongoose.Types.ObjectId;
    sharedBy: mongoose.Types.ObjectId;
    sharedWith: mongoose.Types.ObjectId;
    encryptedSharedKey: string;
    permissions: string[];
}

const SharedFolderSchema: Schema = new Schema({
    folderId: { type: Schema.Types.ObjectId, ref: 'Folder', required: true },
    sharedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    sharedWith: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    encryptedSharedKey: { type: String, required: true },
    permissions: { type: [String], default: ['READ', 'DOWNLOAD'] },
}, { timestamps: true });

// Compound index on folderId and sharedWith
SharedFolderSchema.index({ folderId: 1, sharedWith: 1 }, { unique: true });
// Index on sharedWith for efficient retrieval of shared folders
SharedFolderSchema.index({ sharedWith: 1 });

export default mongoose.model<ISharedFolder>('SharedFolder', SharedFolderSchema);
