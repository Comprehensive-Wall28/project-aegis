import mongoose, { Document, Schema } from 'mongoose';

export interface IFileMetadata extends Document {
    ownerId: mongoose.Types.ObjectId;
    googleDriveFileId?: string; // Optional initially, populated after upload success
    fileName: string; // Encrypted
    fileSize: number;
    encryptedSymmetricKey: string;
    mimeType: string;
    status: 'pending' | 'completed' | 'failed';
}

const FileMetadataSchema: Schema = new Schema({
    ownerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    googleDriveFileId: { type: String },
    fileName: { type: String, required: true },
    fileSize: { type: Number, required: true },
    encryptedSymmetricKey: { type: String, required: true },
    mimeType: { type: String, required: true },
    status: { type: String, enum: ['pending', 'completed', 'failed'], default: 'pending' }
}, { timestamps: true });

export default mongoose.model<IFileMetadata>('FileMetadata', FileMetadataSchema);
