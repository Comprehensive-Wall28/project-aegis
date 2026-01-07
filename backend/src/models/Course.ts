import mongoose, { Document, Schema } from 'mongoose';

export interface ICourse extends Document {
    userId: mongoose.Types.ObjectId;
    name: string;
    grade: number;          // Grade value (0-4.0 for Normal, 1.0-5.0 for German)
    credits: number;
    semester: string;       // e.g., "Fall 2025"
    recordHash: string;     // For integrity verification
}

const CourseSchema: Schema = new Schema({
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    name: { type: String, required: true, trim: true },
    grade: { type: Number, required: true, min: 0 },
    credits: { type: Number, required: true, min: 0.5 },
    semester: { type: String, required: true, trim: true },
    recordHash: { type: String, required: true },
}, { timestamps: true });

// Compound index for efficient queries by user and semester
CourseSchema.index({ userId: 1, semester: 1 });

export default mongoose.model<ICourse>('Course', CourseSchema);
