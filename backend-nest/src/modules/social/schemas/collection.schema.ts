import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ timestamps: true })
export class Collection {
    @Prop({ type: Types.ObjectId, ref: 'Room', required: true, index: true })
    roomId!: Types.ObjectId;

    @Prop({ default: '' })
    name!: string;

    @Prop({ default: 0 })
    order!: number;

    @Prop({ required: true, enum: ['links', 'discussion'] })
    type!: string;
}

export type CollectionDocument = Collection & Document;
export const CollectionSchema = SchemaFactory.createForClass(Collection);

CollectionSchema.index({ roomId: 1, order: 1 });
