import mongoose, { Document, Schema } from 'mongoose';

export interface INote extends Document {
    userId: mongoose.Types.ObjectId;
    // Note Identity
    encryptedTitle?: string;            // Encrypted note title (client-side encrypted)
    noteFolderId?: mongoose.Types.ObjectId; // Reference to NoteFolder (null = root)
    // Encryption Metadata (Same pattern as Tasks)
    encapsulatedKey: string;        // ML-KEM-768 ciphertext (hex)
    encryptedSymmetricKey: string;  // Wrapped AES-256 key (hex)
    // Content Storage
    gridFsFileId: mongoose.Types.ObjectId; // Pointer to GridFS file containing encrypted content
    contentSize: number;            // Size of encrypted content in bytes
    // Rich Features
    tags: string[];
    linkedEntityIds: string[];      // IDs of Tasks/Files mentioned in this note (for backlinks)
    educationalContext?: {
        subject?: string;
        semester?: string;
    };
    recordHash: string;             // Integrity verification
}

const NoteSchema: Schema = new Schema({
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    // Note identity
    encryptedTitle: { type: String, default: null },
    noteFolderId: { type: Schema.Types.ObjectId, ref: 'NoteFolder', default: null, index: true },
    // Encryption fields
    encapsulatedKey: { type: String, required: true },
    encryptedSymmetricKey: { type: String, required: true },
    // Content storage
    gridFsFileId: { type: Schema.Types.ObjectId, required: true },
    contentSize: { type: Number, required: true, default: 0 },
    // Rich features
    tags: { type: [String], default: [], index: true },
    linkedEntityIds: { type: [String], default: [], index: true },
    educationalContext: {
        subject: { type: String },
        semester: { type: String }
    },
    recordHash: { type: String, required: true },
}, { timestamps: true });

// Compound indexes for efficient querying
NoteSchema.index({ userId: 1, tags: 1 });
NoteSchema.index({ userId: 1, noteFolderId: 1 });
NoteSchema.index({ userId: 1, 'educationalContext.subject': 1 });
NoteSchema.index({ userId: 1, createdAt: -1 });

export default mongoose.model<INote>('Note', NoteSchema);

