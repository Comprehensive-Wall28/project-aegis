import mongoose, { Document, Schema } from 'mongoose';

export interface INoteMedia extends Document {
    ownerId: mongoose.Types.ObjectId;
    gridFsFileId: mongoose.Types.ObjectId;
    fileName: string; // Encrypted filename
    originalFileName: string;
    fileSize: number;
    mimeType: string;
    encapsulatedKey: string;
    encryptedSymmetricKey: string;
    uploadStreamId?: string; // Tracking GridFS upload session
    status: 'pending' | 'uploading' | 'completed' | 'failed';
    createdAt?: Date;
    updatedAt?: Date;
}

const NoteMediaSchema: Schema = new Schema({
    ownerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    gridFsFileId: { type: Schema.Types.ObjectId }, // Populated on finalize
    fileName: { type: String, required: true },
    originalFileName: { type: String, required: true },
    fileSize: { type: Number, required: true },
    mimeType: { type: String, required: true },
    encapsulatedKey: { type: String, required: true },
    encryptedSymmetricKey: { type: String, required: true },
    uploadStreamId: { type: String },
    status: { type: String, enum: ['pending', 'uploading', 'completed', 'failed'], default: 'pending' }
}, { timestamps: true });

export default mongoose.model<INoteMedia>('NoteMedia', NoteMediaSchema);
