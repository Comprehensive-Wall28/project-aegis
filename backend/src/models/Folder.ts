import mongoose, { Document, Schema } from 'mongoose';

export interface IFolder extends Document {
    ownerId: mongoose.Types.ObjectId;
    name: string;
    parentId?: mongoose.Types.ObjectId; // null = root level
    encryptedSessionKey: string;
    isShared: boolean;
    createdAt?: Date;
    updatedAt?: Date;
}

const FolderSchema: Schema = new Schema({
    ownerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    name: { type: String, required: true },
    parentId: { type: Schema.Types.ObjectId, ref: 'Folder', default: null },
    encryptedSessionKey: { type: String, required: true },
    isShared: { type: Boolean, default: false },
}, { timestamps: true });

// Compound index for efficient folder queries
FolderSchema.index({ ownerId: 1, parentId: 1 });

export default mongoose.model<IFolder>('Folder', FolderSchema);
