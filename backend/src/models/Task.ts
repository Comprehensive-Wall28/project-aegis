import mongoose, { Document, Schema } from 'mongoose';

export interface ITask extends Document {
    userId: mongoose.Types.ObjectId;
    // Encrypted fields
    encryptedData: string;          // AES-GCM encrypted JSON { title, description, notes }
    encapsulatedKey: string;        // ML-KEM-768 cipher text (hex)
    encryptedSymmetricKey: string;  // Wrapped AES key (hex)
    // Plaintext fields for sorting/filtering
    dueDate?: Date;
    priority: 'high' | 'medium' | 'low';
    status: 'todo' | 'in_progress' | 'done';
    order: number;                  // For Kanban ordering within status column
    recordHash: string;             // Integrity verification
}

const TaskSchema: Schema = new Schema({
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    // Encrypted fields
    encryptedData: { type: String, required: true },
    encapsulatedKey: { type: String, required: true },
    encryptedSymmetricKey: { type: String, required: true },
    // Plaintext fields for querying
    dueDate: { type: Date, required: false },
    priority: {
        type: String,
        enum: ['high', 'medium', 'low'],
        default: 'medium',
        required: true
    },
    status: {
        type: String,
        enum: ['todo', 'in_progress', 'done'],
        default: 'todo',
        required: true
    },
    order: { type: Number, default: 0, required: true },
    recordHash: { type: String, required: true },
}, { timestamps: true });

// Compound indexes for efficient querying
TaskSchema.index({ userId: 1, status: 1 });
TaskSchema.index({ userId: 1, priority: 1 });
TaskSchema.index({ userId: 1, dueDate: 1 });
TaskSchema.index({ userId: 1, status: 1, order: 1 });

export default mongoose.model<ITask>('Task', TaskSchema);
