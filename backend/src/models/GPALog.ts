import mongoose, { Document, Schema } from 'mongoose';

export interface IGPALog extends Document {
    userId: mongoose.Types.ObjectId;
    semester: string;
    gpa: number;
    recordHash: string;
}

const GPALogSchema: Schema = new Schema({
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    semester: { type: String, required: true },
    gpa: { type: Number, required: true },
    recordHash: { type: String, required: true },
}, { timestamps: true });

// Ensure a user can't have duplicate semester logs easily if we want, 
// GPALogSchema.index({ userId: 1, semester: 1 }, { unique: true });

export default mongoose.model<IGPALog>('GPALog', GPALogSchema);
