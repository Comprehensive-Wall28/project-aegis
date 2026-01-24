import mongoose, { Document, Schema } from 'mongoose';

export interface INoteFolder extends Document {
    userId: mongoose.Types.ObjectId;
    name: string;                       // Plaintext folder name (organizational, not sensitive)
    parentId?: mongoose.Types.ObjectId; // null = root level
    color?: string;                     // Folder color (hex)
    createdAt?: Date;
    updatedAt?: Date;
}

const NoteFolderSchema: Schema = new Schema({
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    name: { type: String, required: true },
    parentId: { type: Schema.Types.ObjectId, ref: 'NoteFolder', default: null },
    color: { type: String, default: null },
}, { timestamps: true });

// Compound indexes for efficient folder queries
NoteFolderSchema.index({ userId: 1, parentId: 1 });
NoteFolderSchema.index({ userId: 1, name: 1 });

export default mongoose.model<INoteFolder>('NoteFolder', NoteFolderSchema);
