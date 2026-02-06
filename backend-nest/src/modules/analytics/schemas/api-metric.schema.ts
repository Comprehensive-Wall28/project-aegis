import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema, Types } from 'mongoose';

@Schema({ timestamps: { createdAt: true, updatedAt: false } })
export class ApiMetric extends Document {
    @Prop({ type: String, required: true, index: true })
    method: string;

    @Prop({ type: String, required: true, index: true })
    path: string;

    @Prop({ type: Number, required: true, index: true })
    statusCode: number;

    @Prop({ type: Number, required: true, index: true })
    durationMs: number;

    @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: false, index: true })
    userId?: Types.ObjectId;

    @Prop({ type: String, required: true })
    ipAddress: string;

    @Prop({ type: String, required: false })
    userAgent?: string;

    @Prop({ type: Date, default: Date.now, index: true })
    timestamp: Date;

    @Prop({ type: MongooseSchema.Types.Mixed, default: {} })
    metadata: Record<string, any>;
}

export const ApiMetricSchema = SchemaFactory.createForClass(ApiMetric);
ApiMetricSchema.index({ timestamp: 1 }, { expireAfterSeconds: 2592000 }); // 30 days
ApiMetricSchema.index({ path: 1, timestamp: -1 });
ApiMetricSchema.index({ statusCode: 1, timestamp: -1 });
ApiMetricSchema.index({ method: 1, path: 1, timestamp: -1 });
