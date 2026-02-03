import mongoose, { Document, Schema } from 'mongoose';

export interface IApiMetric extends Document {
    method: string;
    path: string;
    statusCode: number;
    durationMs: number;
    userId?: mongoose.Types.ObjectId;
    ipAddress: string;
    userAgent?: string;
    timestamp: Date;
    metadata?: {
        query?: Record<string, any>;
        contentLength?: number;
        errorMessage?: string;
    };
}

const ApiMetricSchema: Schema = new Schema({
    method: {
        type: String,
        required: true,
        index: true,
    },
    path: {
        type: String,
        required: true,
        index: true,
    },
    statusCode: {
        type: Number,
        required: true,
        index: true,
    },
    durationMs: {
        type: Number,
        required: true,
        index: true,
    },
    userId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: false,
        index: true,
    },
    ipAddress: {
        type: String,
        required: true,
    },
    userAgent: {
        type: String,
        required: false,
    },
    timestamp: {
        type: Date,
        default: Date.now,
    },
    metadata: {
        type: Schema.Types.Mixed,
        default: {},
    },
});

// TTL index: auto-delete after 30 days (30 * 24 * 60 * 60 = 2592000 seconds)
ApiMetricSchema.index({ timestamp: 1 }, { expireAfterSeconds: 2592000 });

// Compound indexes for common queries
ApiMetricSchema.index({ path: 1, timestamp: -1 });
ApiMetricSchema.index({ statusCode: 1, timestamp: -1 });
ApiMetricSchema.index({ method: 1, path: 1, timestamp: -1 });

export default mongoose.model<IApiMetric>('ApiMetric', ApiMetricSchema);
