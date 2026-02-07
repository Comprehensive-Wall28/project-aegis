import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type LinkCommentDocument = LinkComment & Document;

@Schema({ timestamps: true })
export class LinkComment {
  @Prop({ type: Types.ObjectId, ref: 'LinkPost', required: true })
  linkId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({ required: true })
  encryptedContent: string;
}

export const LinkCommentSchema = SchemaFactory.createForClass(LinkComment);
LinkCommentSchema.index({ linkId: 1, createdAt: -1 });
