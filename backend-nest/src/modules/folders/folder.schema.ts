import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema, Types } from 'mongoose';

export type FolderDocument = Folder & Document;

@Schema({ timestamps: true, collection: 'folders' })
export class Folder {
    @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true, index: true })
    ownerId: Types.ObjectId;

    @Prop({ type: String, required: true })
    name: string;

    @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Folder', default: null })
    parentId: Types.ObjectId | null;

    @Prop({ type: String, required: true })
    encryptedSessionKey: string;

    @Prop({ type: Boolean, default: false })
    isShared: boolean;

    @Prop({ type: String, default: null })
    color: string | null;
}

export const FolderSchema = SchemaFactory.createForClass(Folder);

// Compound index for efficient folder queries
FolderSchema.index({ ownerId: 1, parentId: 1, name: 1 });
