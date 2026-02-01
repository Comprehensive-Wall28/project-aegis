import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { User } from '../../users/schemas/user.schema';

export type SharedLinkDocument = SharedLink & Document;

@Schema({ timestamps: true })
export class SharedLink {
  @Prop({ required: true, unique: true })
  token!: string;

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    required: true,
    refPath: 'resourceModel',
  })
  resourceId!: MongooseSchema.Types.ObjectId;

  @Prop({ required: true, enum: ['file', 'folder'] })
  resourceType!: string;

  @Prop({ required: true })
  encryptedKey!: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
  creatorId!: User;

  @Prop({ default: 0 })
  views!: number;

  @Prop()
  expiresAt?: Date;

  @Prop({ default: false })
  isPublic!: boolean;

  @Prop({ type: [String], default: [] })
  allowedEmails!: string[];
}

export const SharedLinkSchema = SchemaFactory.createForClass(SharedLink);

// Basic indexes
SharedLinkSchema.index({ resourceId: 1 });
SharedLinkSchema.index({ creatorId: 1 });

// TTL index for automatic expiration
SharedLinkSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Virtual to help population
SharedLinkSchema.virtual('resourceModel').get(function (
  this: SharedLinkDocument,
) {
  return this.resourceType === 'file' ? 'FileMetadata' : 'Folder';
});
