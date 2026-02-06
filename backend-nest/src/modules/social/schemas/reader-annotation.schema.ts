import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ReaderAnnotationDocument = ReaderAnnotation & Document;

@Schema({ timestamps: { createdAt: true, updatedAt: false } })
export class ReaderAnnotation {
    @Prop({ type: Types.ObjectId, ref: 'LinkPost', required: true, index: true })
    linkId: Types.ObjectId;

    @Prop({ type: Types.ObjectId, ref: 'Room', required: true, index: true })
    roomId: Types.ObjectId;

    @Prop({ type: Types.ObjectId, ref: 'User', required: true })
    userId: Types.ObjectId;

    @Prop({ required: true })
    paragraphId: string;

    @Prop({ required: true, maxlength: 500 })
    highlightText: string;

    @Prop({ required: true })
    encryptedContent: string;
}

export const ReaderAnnotationSchema = SchemaFactory.createForClass(ReaderAnnotation);
ReaderAnnotationSchema.index({ linkId: 1, roomId: 1 });
