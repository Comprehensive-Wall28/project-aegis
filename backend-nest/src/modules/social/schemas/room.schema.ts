import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type RoomDocument = Room & Document;

@Schema({ timestamps: true })
export class Room {
    @Prop({ required: true })
    name: string;

    @Prop({ default: '' })
    description: string;

    @Prop({ default: '' })
    icon: string;

    @Prop({
        type: [{
            userId: { type: Types.ObjectId, ref: 'User', required: true },
            role: { type: String, enum: ['owner', 'admin', 'member'], required: true },
            encryptedRoomKey: { type: String, required: true }
        }],
        required: true
    })
    members: {
        userId: Types.ObjectId;
        role: 'owner' | 'admin' | 'member';
        encryptedRoomKey: string;
    }[];

    @Prop({ unique: true, sparse: true })
    inviteCode?: string;
}

export const RoomSchema = SchemaFactory.createForClass(Room);

RoomSchema.index({ 'members.userId': 1 });
