import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ timestamps: { createdAt: true, updatedAt: false } })
export class ReaderAnnotation extends Document {
  @Prop({ type: Types.ObjectId, ref: 'LinkPost', required: true, index: true })
  linkId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Room', required: true, index: true })
  roomId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId!: Types.ObjectId;

  @Prop({ required: true })
  paragraphId!: string;

  @Prop({ required: true, maxlength: 500 })
  highlightText!: string;

  @Prop({ required: true })
  encryptedContent!: string;
}

export const ReaderAnnotationSchema =
  SchemaFactory.createForClass(ReaderAnnotation);

// Compound index for efficient queries by link and room
ReaderAnnotationSchema.index({ linkId: 1, roomId: 1 });
