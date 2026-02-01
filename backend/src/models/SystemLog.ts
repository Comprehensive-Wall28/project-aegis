import mongoose, { Document, Schema } from 'mongoose';

export type LogLevel = 'warn' | 'error';

export interface ISystemLog extends Document {
    level: LogLevel;
    message: string;
    timestamp: Date;
    service: string;
    method?: string;
    url?: string;
    userId?: string;
    statusCode?: number;
    error?: string;
    stack?: string;
    metadata?: Record<string, any>;
}

const SystemLogSchema = new Schema<ISystemLog>({
    level: {
        type: String,
        enum: ['warn', 'error'],
        required: true,
        index: true,
    },
    message: {
        type: String,
        required: true,
    },
    timestamp: {
        type: Date,
        default: Date.now,
        index: true,
    },
    service: {
        type: String,
        default: 'aegis-backend',
    },
    method: String,
    url: String,
    userId: String,
    statusCode: Number,
    error: String,
    stack: String,
    metadata: Schema.Types.Mixed,
}, {
    collection: 'system_logs',
    // Automatically delete logs older than 30 days
    expireAfterSeconds: 30 * 24 * 60 * 60,
});

// Indexes for efficient querying
SystemLogSchema.index({ timestamp: -1 });
SystemLogSchema.index({ level: 1, timestamp: -1 });
SystemLogSchema.index({ service: 1, timestamp: -1 });

// Use secondary connection for system logs
import DatabaseManager from '../config/DatabaseManager';
const dbManager = DatabaseManager.getInstance();

let SystemLogModel: mongoose.Model<ISystemLog>;

try {
    const secondaryConnection = dbManager.getConnection('secondary');
    SystemLogModel = secondaryConnection.model<ISystemLog>('SystemLog', SystemLogSchema);
} catch (error) {
    // Fallback to primary if secondary not available
    console.warn('⚠️  Secondary DB not available for system logs, using primary');
    SystemLogModel = mongoose.model<ISystemLog>('SystemLog', SystemLogSchema);
}

export default SystemLogModel;
