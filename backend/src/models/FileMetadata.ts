import mongoose, { Document, Schema } from 'mongoose';

export interface IFileMetadata extends Document {
    ownerId: mongoose.Types.ObjectId;
    folderId?: mongoose.Types.ObjectId; // null = root level
    googleDriveFileId?: string; // Google Drive file reference, populated after upload success
    uploadStreamId?: string; // Temporary session ID during upload progress
    fileName: string; // Encrypted filename
    originalFileName: string; // Original filename for display and download
    fileSize: number;
    encapsulatedKey: string;
    encryptedSymmetricKey: string;
    mimeType: string;
    status: 'pending' | 'uploading' | 'completed' | 'failed';
}

const FileMetadataSchema: Schema = new Schema({
    ownerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    folderId: { type: Schema.Types.ObjectId, ref: 'Folder', default: null },
    googleDriveFileId: { type: String }, // Google Drive file reference
    uploadStreamId: { type: String }, // Temporary session ID during upload
    fileName: { type: String, required: true },
    originalFileName: { type: String, required: true }, // Original filename
    fileSize: { type: Number, required: true },
    encapsulatedKey: { type: String, required: true },
    encryptedSymmetricKey: { type: String, required: true },
    mimeType: { type: String, required: true },
    status: { type: String, enum: ['pending', 'uploading', 'completed', 'failed'], default: 'pending' }
}, { timestamps: true });

export default mongoose.model<IFileMetadata>('FileMetadata', FileMetadataSchema);

