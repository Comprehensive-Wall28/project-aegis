import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema, Types } from 'mongoose';

export type TaskDocument = Task & Document;

@Schema({ timestamps: true, collection: 'tasks' })
export class Task {
    @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true, index: true })
    userId: Types.ObjectId;

    // Encrypted fields
    @Prop({ type: String, required: true })
    encryptedData: string;          // AES-GCM encrypted JSON { title, description, notes }

    @Prop({ type: String, required: true })
    encapsulatedKey: string;        // ML-KEM-768 cipher text (hex)

    @Prop({ type: String, required: true })
    encryptedSymmetricKey: string;  // Wrapped AES key (hex)

    // Plaintext fields for sorting/filtering
    @Prop({ type: Date, required: false })
    dueDate?: Date;

    @Prop({
        type: String,
        enum: ['high', 'medium', 'low'],
        default: 'medium',
        required: true
    })
    priority: string;

    @Prop({
        type: String,
        enum: ['todo', 'in_progress', 'done'],
        default: 'todo',
        required: true
    })
    status: string;

    @Prop({ type: Number, default: 0, required: true })
    order: number;                  // For Kanban ordering within status column

    @Prop({ type: String, required: true })
    recordHash: string;             // Integrity verification

    @Prop({ type: [String], default: [], index: true })
    mentions: string[];             // IDs of mentioned entities (files, tasks, events)
}

export const TaskSchema = SchemaFactory.createForClass(Task);

// Compound indexes for efficient querying
TaskSchema.index({ userId: 1, status: 1 });
TaskSchema.index({ userId: 1, priority: 1 });
TaskSchema.index({ userId: 1, dueDate: 1 });
TaskSchema.index({ userId: 1, status: 1, order: 1 });
