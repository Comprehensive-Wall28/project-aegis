import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IRoomMember {
    userId: Types.ObjectId | string;
    role: 'owner' | 'admin' | 'member';
    encryptedRoomKey: string;
}

export interface IRoom extends Document {
    name: string; // Encrypted
    description: string; // Encrypted
    icon: string; // Encrypted
    members: IRoomMember[];
    inviteCode?: string;
}

const RoomMemberSchema = new Schema({
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    role: { type: String, enum: ['owner', 'admin', 'member'], required: true },
    encryptedRoomKey: { type: String, required: true }
}, { _id: false });

const RoomSchema = new Schema<IRoom>({
    name: { type: String, required: true }, // Encrypted base64
    description: { type: String, default: '' }, // Encrypted base64
    icon: { type: String, default: '' }, // Encrypted base64
    members: [RoomMemberSchema],
    inviteCode: { type: String, unique: true, sparse: true }
}, { timestamps: true });

// Index for efficient member lookup
RoomSchema.index({ 'members.userId': 1 });

export default mongoose.model<IRoom>('Room', RoomSchema);
