import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema, Types } from 'mongoose';

export enum LogLevel {
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
}

@Schema({ timestamps: { createdAt: true, updatedAt: false } })
export class LogEntry extends Document {
  @Prop({ type: String, required: true, enum: LogLevel, index: true })
  level: LogLevel;

  @Prop({ type: String, required: true })
  message: string;

  @Prop({ type: String, required: true, index: true })
  source: string;

  @Prop({ type: MongooseSchema.Types.Mixed, default: {} })
  metadata: Record<string, any>;

  @Prop({ type: Date, default: Date.now })
  timestamp: Date;

  @Prop({ type: String, required: false })
  stackTrace?: string;

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'User',
    required: false,
    index: true,
  })
  userId?: Types.ObjectId;

  @Prop({ type: String, required: false, index: true })
  requestId?: string;
}

export const LogEntrySchema = SchemaFactory.createForClass(LogEntry);
LogEntrySchema.index({ timestamp: 1 }, { expireAfterSeconds: 2592000 });
LogEntrySchema.index({ level: 1, timestamp: -1 });
LogEntrySchema.index({ source: 1, timestamp: -1 });
