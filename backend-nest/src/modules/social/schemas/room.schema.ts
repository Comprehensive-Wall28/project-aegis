import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ _id: false })
export class RoomMember {
    @Prop({ type: Types.ObjectId, ref: 'User', required: true })
    userId!: Types.ObjectId;

    @Prop({ type: String, enum: ['owner', 'admin', 'member'], required: true })
    role!: string;

    @Prop({ type: String, required: true })
    encryptedRoomKey!: string;
}

@Schema({ timestamps: true })
export class Room {
    @Prop({ required: true })
    name!: string;

    @Prop({ default: '' })
    description!: string;

    @Prop({ default: '' })
    icon!: string;

    @Prop({ type: [RoomMember], default: [] })
    members!: RoomMember[];

    @Prop({ type: String, unique: true, sparse: true })
    inviteCode?: string;
}

export type RoomDocument = Room & Document;
export const RoomSchema = SchemaFactory.createForClass(Room);

RoomSchema.index({ 'members.userId': 1 });
