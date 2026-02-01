import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ timestamps: true })
export class CalendarEvent {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  userId!: Types.ObjectId;

  // Encrypted fields
  @Prop({ required: true })
  encryptedData!: string;

  @Prop({ required: true })
  encapsulatedKey!: string;

  @Prop({ required: true })
  encryptedSymmetricKey!: string;

  // Metadata (plaintext)
  @Prop({ required: true, index: true })
  startDate!: Date;

  @Prop({ required: true, index: true })
  endDate!: Date;

  @Prop({ default: false })
  isAllDay!: boolean;

  @Prop({ required: false })
  color!: string;

  @Prop({ required: false })
  recordHash!: string;

  @Prop({ type: [String], default: [] })
  mentions!: string[];
}

export type CalendarEventDocument = CalendarEvent & Document;
export const CalendarEventSchema = SchemaFactory.createForClass(CalendarEvent);

// Index for date range filtering
CalendarEventSchema.index({ userId: 1, startDate: 1, endDate: 1 });
