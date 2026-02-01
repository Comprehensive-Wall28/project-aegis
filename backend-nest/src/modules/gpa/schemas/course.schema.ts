import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ timestamps: true })
export class Course {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  userId!: Types.ObjectId;

  // Encrypted fields
  @Prop({ required: true })
  encryptedData!: string;

  @Prop({ required: true })
  encapsulatedKey!: string;

  @Prop({ required: true })
  encryptedSymmetricKey!: string;

  // Legacy plaintext fields (optional for migration support)
  @Prop()
  name?: string;

  @Prop()
  grade?: number;

  @Prop()
  credits?: number;

  @Prop()
  semester?: string;
}

export type CourseDocument = Course & Document;
export const CourseSchema = SchemaFactory.createForClass(Course);
