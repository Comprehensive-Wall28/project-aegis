import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ timestamps: false })
export class LinkView extends Document {
  @Prop({ type: Types.ObjectId, ref: 'LinkPost', required: true })
  linkId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Collection' })
  collectionId?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Room' })
  roomId?: Types.ObjectId;

  @Prop({ default: Date.now })
  viewedAt!: Date;
}

export const LinkViewSchema = SchemaFactory.createForClass(LinkView);

// Compound unique index to prevent duplicate views
LinkViewSchema.index({ linkId: 1, userId: 1 }, { unique: true });

// Index for efficient lookup of all views by a user
LinkViewSchema.index({ userId: 1 });

// Index for room-wide unviewed count aggregation
LinkViewSchema.index({ roomId: 1, userId: 1, collectionId: 1 });
