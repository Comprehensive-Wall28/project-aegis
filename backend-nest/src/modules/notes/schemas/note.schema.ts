import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type NoteDocument = Note & Document;

@Schema()
class EducationalContext {
    @Prop()
    subject?: string;

    @Prop()
    semester?: string;
}

@Schema({ timestamps: true })
export class Note {
    @Prop({ type: Types.ObjectId, ref: 'User', required: true })
    userId!: Types.ObjectId;

    // Note Identity
    @Prop()
    encryptedTitle?: string;            // Encrypted note title (client-side encrypted)

    @Prop({ type: Types.ObjectId, ref: 'NoteFolder', default: null })
    noteFolderId?: Types.ObjectId; // Reference to NoteFolder (null = root)

    // Encryption Metadata (Same pattern as Tasks)
    @Prop({ required: true })
    encapsulatedKey!: string;        // ML-KEM-768 ciphertext (hex)

    @Prop({ required: true })
    encryptedSymmetricKey!: string;  // Wrapped AES-256 key (hex)

    // Content Storage (GridFS)
    @Prop({ type: Types.ObjectId, required: true })
    gridFsFileId!: Types.ObjectId; // Pointer to GridFS file containing encrypted content

    @Prop({ required: true, default: 0 })
    contentSize!: number;            // Size of encrypted content in bytes

    // Rich Features
    @Prop({ type: [String], default: [] })
    tags!: string[];

    @Prop({ type: [String], default: [] })
    linkedEntityIds!: string[];      // IDs of Tasks/Files mentioned in this note (for backlinks)

    @Prop({ type: Object })
    educationalContext?: {
        subject?: string;
        semester?: string;
    };

    @Prop({ required: true })
    recordHash!: string;             // Integrity verification
}

export const NoteSchema = SchemaFactory.createForClass(Note);

// Compound indexes
NoteSchema.index({ userId: 1, tags: 1 });
NoteSchema.index({ userId: 1, noteFolderId: 1 });
NoteSchema.index({ userId: 1, 'educationalContext.subject': 1 });
NoteSchema.index({ userId: 1, createdAt: -1 });
