import mongoose, { Document, Schema } from 'mongoose';

export interface ICalendarEvent extends Document {
    userId: mongoose.Types.ObjectId;
    // Encrypted fields
    encryptedData: string;         // AES-GCM encrypted JSON { title, description, location }
    encapsulatedKey: string;       // ML-KEM-768 cipher text (hex)
    encryptedSymmetricKey: string;  // Wrapped AES key (hex)
    // Plaintext fields for scheduling and UI
    startDate: Date;
    endDate: Date;
    isAllDay: boolean;
    color: string;
    recordHash: string;            // Integrity check
}

const CalendarEventSchema: Schema = new Schema({
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    encryptedData: { type: String, required: true },
    encapsulatedKey: { type: String, required: true },
    encryptedSymmetricKey: { type: String, required: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    isAllDay: { type: Boolean, default: false },
    color: { type: String, default: '#3f51b5' },
    recordHash: { type: String, required: true },
}, { timestamps: true });

// Index for date range filtering
CalendarEventSchema.index({ userId: 1, startDate: 1, endDate: 1 });

export default mongoose.model<ICalendarEvent>('CalendarEvent', CalendarEventSchema);
