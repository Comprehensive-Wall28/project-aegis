import mongoose, { Document, Schema } from 'mongoose';

export type LogLevel = 'INFO' | 'WARN' | 'ERROR';

export interface ILogEntry extends Document {
    level: LogLevel;
    message: string;
    source: string;
    metadata?: Record<string, any>;
    timestamp: Date;
    stackTrace?: string;
    userId?: mongoose.Types.ObjectId;
    requestId?: string;
}

const LogEntrySchema: Schema = new Schema({
    level: {
        type: String,
        required: true,
        enum: ['INFO', 'WARN', 'ERROR'],
        index: true,
    },
    message: {
        type: String,
        required: true,
    },
    source: {
        type: String,
        required: true,
        index: true,
    },
    metadata: {
        type: Schema.Types.Mixed,
        default: {},
    },
    timestamp: {
        type: Date,
        default: Date.now,
    },
    stackTrace: {
        type: String,
        required: false,
    },
    userId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: false,
        index: true,
    },
    requestId: {
        type: String,
        required: false,
        index: true,
    },
});

// TTL index: auto-delete after 30 days
LogEntrySchema.index({ timestamp: 1 }, { expireAfterSeconds: 2592000 });

// Compound indexes for common queries
LogEntrySchema.index({ level: 1, timestamp: -1 });
LogEntrySchema.index({ source: 1, timestamp: -1 });

export default mongoose.model<ILogEntry>('LogEntry', LogEntrySchema);
