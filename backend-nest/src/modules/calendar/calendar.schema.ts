import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema, Types } from 'mongoose';

export type CalendarEventDocument = CalendarEvent & Document;

@Schema({ timestamps: true, collection: 'calendarevents' })
export class CalendarEvent {
    @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true, index: true })
    userId: Types.ObjectId;

    // Encrypted fields
    @Prop({ type: String, required: true })
    encryptedData: string;          // AES-GCM encrypted JSON { title, description, location }

    @Prop({ type: String, required: true })
    encapsulatedKey: string;          // ML-KEM-768 cipher text (hex)

    @Prop({ type: String, required: true })
    encryptedSymmetricKey: string;   // Wrapped AES key (hex)

    // Plaintext fields for scheduling and UI
    @Prop({ type: Date, required: true })
    startDate: Date;

    @Prop({ type: Date, required: true })
    endDate: Date;

    @Prop({ type: Boolean, default: false })
    isAllDay: boolean;

    @Prop({ type: String, default: '#3f51b5' })
    color: string;

    @Prop({ type: String, required: true })
    recordHash: string;              // Integrity verification

    @Prop({ type: [String], default: [], index: true })
    mentions: string[];             // IDs of mentioned entities (files, tasks, events)
}

export const CalendarEventSchema = SchemaFactory.createForClass(CalendarEvent);

// Compound indexes for efficient querying
CalendarEventSchema.index({ userId: 1, startDate: 1, endDate: 1 });
