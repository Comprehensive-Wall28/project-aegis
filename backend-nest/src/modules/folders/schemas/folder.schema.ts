import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type FolderDocument = Folder & Document;

@Schema({ timestamps: true })
export class Folder {
    @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
    ownerId: Types.ObjectId;

    @Prop({ required: true })
    name: string;

    @Prop({ type: Types.ObjectId, ref: 'Folder', default: null })
    parentId?: Types.ObjectId;

    @Prop({ required: true })
    encryptedSessionKey: string;

    @Prop({ default: false })
    isShared: boolean;

    @Prop({ type: String, default: null })
    color?: string;
}

export const FolderSchema = SchemaFactory.createForClass(Folder);

FolderSchema.index({ ownerId: 1, parentId: 1, name: 1 });
