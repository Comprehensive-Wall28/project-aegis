import mongoose, { Document, Schema } from 'mongoose';

export interface IFileMetadata extends Document {
    ownerId: mongoose.Types.ObjectId;
    folderId?: mongoose.Types.ObjectId; // null = root level
    googleDriveFileId?: string; // Google Drive file reference, populated after upload success
    uploadStreamId?: string; // Temporary session ID during upload progress
    uploadSessionUrl?: string; // Google Drive resumable session URL
    uploadOffset?: number; // Confirmed bytes uploaded
    fileName: string; // Encrypted filename
    originalFileName: string; // Original filename for display and download
    fileSize: number;
    encapsulatedKey: string;
    encryptedSymmetricKey: string;
    mimeType: string;
    status: 'pending' | 'uploading' | 'completed' | 'failed';
    createdAt?: Date;
    updatedAt?: Date;
}

const FileMetadataSchema: Schema = new Schema({
    ownerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    folderId: { type: Schema.Types.ObjectId, ref: 'Folder', default: null },
    googleDriveFileId: { type: String }, // Google Drive file reference
    uploadStreamId: { type: String }, // Temporary session ID during upload progress
    uploadSessionUrl: { type: String }, // Google Drive resumable session URL
    uploadOffset: { type: Number, default: 0 }, // Confirmed bytes uploaded
    fileName: { type: String, required: true },
    originalFileName: { type: String, required: true }, // Original filename
    fileSize: { type: Number, required: true },
    encapsulatedKey: { type: String, required: true },
    encryptedSymmetricKey: { type: String, required: true },
    mimeType: { type: String, required: true },
    status: { type: String, enum: ['pending', 'uploading', 'completed', 'failed'], default: 'pending' }
}, { timestamps: true });

FileMetadataSchema.index({ ownerId: 1, folderId: 1 });

export default mongoose.model<IFileMetadata>('FileMetadata', FileMetadataSchema);

