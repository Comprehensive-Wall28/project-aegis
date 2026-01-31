import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ timestamps: true })
export class LinkComment extends Document {
  @Prop({ type: Types.ObjectId, ref: 'LinkPost', required: true, index: true })
  linkId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId!: Types.ObjectId;

  @Prop({ required: true })
  encryptedContent!: string;

  @Prop()
  createdAt!: Date;

  @Prop()
  updatedAt!: Date;
}

export const LinkCommentSchema = SchemaFactory.createForClass(LinkComment);

// Index for efficient lookup of comments by link
LinkCommentSchema.index({ linkId: 1, createdAt: 1 });
