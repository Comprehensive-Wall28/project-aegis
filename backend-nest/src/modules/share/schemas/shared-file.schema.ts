import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { User } from '../../users/schemas/user.schema';
import { VaultFile } from '../../vault/schemas/vault-file.schema';

export type SharedFileDocument = SharedFile & Document;

@Schema({ timestamps: true })
export class SharedFile {
    @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'VaultFile', required: true })
    fileId!: VaultFile;

    @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
    sharedBy!: User;

    @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
    sharedWith!: User;

    @Prop({ required: true })
    encryptedSharedKey!: string;

    @Prop({ type: [String], default: ['READ', 'DOWNLOAD'] })
    permissions!: string[];
}

export const SharedFileSchema = SchemaFactory.createForClass(SharedFile);

// Compound index on fileId and sharedWith to prevent duplicate shares
SharedFileSchema.index({ fileId: 1, sharedWith: 1 }, { unique: true });
// Index on sharedWith for efficient retrieval of shared files
SharedFileSchema.index({ sharedWith: 1 });
