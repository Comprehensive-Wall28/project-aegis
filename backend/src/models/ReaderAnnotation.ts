import { Schema, model, Document, Types } from 'mongoose';

export interface IReaderAnnotation extends Document {
    _id: Types.ObjectId;
    linkId: Types.ObjectId;
    roomId: Types.ObjectId;
    userId: Types.ObjectId;
    paragraphId: string; // Hash/identifier for the paragraph
    highlightText: string; // The highlighted text snippet (for display)
    encryptedContent: string; // Encrypted annotation content
    createdAt: Date;
}

const ReaderAnnotationSchema = new Schema<IReaderAnnotation>({
    linkId: {
        type: Schema.Types.ObjectId,
        ref: 'LinkPost',
        required: true,
        index: true,
    },
    roomId: {
        type: Schema.Types.ObjectId,
        ref: 'Room',
        required: true,
        index: true,
    },
    userId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    paragraphId: {
        type: String,
        required: true,
    },
    highlightText: {
        type: String,
        required: true,
        maxlength: 500, // Limit the highlighted snippet
    },
    encryptedContent: {
        type: String,
        required: true,
    },
}, {
    timestamps: { createdAt: true, updatedAt: false },
});

// Compound index for efficient queries by link and room
ReaderAnnotationSchema.index({ linkId: 1, roomId: 1 });

export const ReaderAnnotation = model<IReaderAnnotation>('ReaderAnnotation', ReaderAnnotationSchema);
