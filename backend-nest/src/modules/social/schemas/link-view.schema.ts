import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type LinkViewDocument = LinkView & Document;

@Schema({ timestamps: true })
export class LinkView {
  @Prop({ type: Types.ObjectId, ref: 'LinkPost', required: true })
  linkId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Collection' })
  collectionId?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Room' })
  roomId?: Types.ObjectId;

  @Prop({ default: Date.now })
  viewedAt: Date;
}

export const LinkViewSchema = SchemaFactory.createForClass(LinkView);
LinkViewSchema.index({ linkId: 1, userId: 1 }, { unique: true });
LinkViewSchema.index({ userId: 1, linkId: 1 });
LinkViewSchema.index({ roomId: 1, userId: 1, collectionId: 1 });
