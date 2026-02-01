import mongoose, { Document, Schema } from 'mongoose';

export type LogLevel = 'info' | 'warn' | 'error';

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
    // Performance metrics
    duration?: number;         // Request duration in ms
    requestSize?: number;      // Request body size in bytes
    responseSize?: number;     // Response body size in bytes
    memoryUsage?: number;      // Heap memory used in bytes
    // TTL field - computed at insert time
    expiresAt: Date;
}

const SystemLogSchema = new Schema<ISystemLog>({
    level: {
        type: String,
        enum: ['info', 'warn', 'error'],
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
    // Performance metrics
    duration: Number,
    requestSize: Number,
    responseSize: Number,
    memoryUsage: Number,
    // TTL field - 7 days for info, 30 days for warn/error
    expiresAt: {
        type: Date,
        required: true,
        index: true,
    },
}, {
    collection: 'system_logs',
});

// TTL index - documents expire when current time > expiresAt
SystemLogSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Indexes for efficient querying
SystemLogSchema.index({ timestamp: -1 });
SystemLogSchema.index({ level: 1, timestamp: -1 });
SystemLogSchema.index({ service: 1, timestamp: -1 });
// Performance query indexes
SystemLogSchema.index({ url: 1, duration: -1 });
SystemLogSchema.index({ timestamp: -1, duration: -1 });
SystemLogSchema.index({ level: 1, duration: -1 });

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
