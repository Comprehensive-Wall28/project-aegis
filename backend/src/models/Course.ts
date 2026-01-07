import mongoose, { Document, Schema } from 'mongoose';

export interface ICourse extends Document {
    userId: mongoose.Types.ObjectId;
    // Encrypted fields - new encrypted format
    encryptedData?: string;        // AES-GCM encrypted JSON of course data (IV:ciphertext, hex)
    encapsulatedKey?: string;      // ML-KEM-768 cipher text (hex)
    encryptedSymmetricKey?: string; // Wrapped AES key (IV + encrypted key, hex)
    // Legacy plaintext fields - for unmigrated data
    name?: string;
    grade?: number;
    credits?: number;
    semester?: string;
}

const CourseSchema: Schema = new Schema({
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    // Encrypted fields (new format)
    encryptedData: { type: String, required: false },
    encapsulatedKey: { type: String, required: false },
    encryptedSymmetricKey: { type: String, required: false },
    // Legacy plaintext fields (for migration)
    name: { type: String, required: false },
    grade: { type: Number, required: false },
    credits: { type: Number, required: false },
    semester: { type: String, required: false },
}, { timestamps: true });

export default mongoose.model<ICourse>('Course', CourseSchema);
