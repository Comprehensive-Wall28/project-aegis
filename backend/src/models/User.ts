import mongoose, { Document, Schema } from 'mongoose';

export interface IUser extends Document {
    username: string;
    email: string;
    pqcPublicKey: string;
    passwordHash: string;
    gpaSystem: 'NORMAL' | 'GERMAN';
}

const UserSchema: Schema = new Schema({

    username: { type: String, required: true, unique: true },

    email: { type: String, required: true, unique: true },

    pqcPublicKey: { type: String, required: true },

    passwordHash: { type: String, required: true },

    gpaSystem: { type: String, enum: ['NORMAL', 'GERMAN'], default: 'NORMAL' },

}, { timestamps: true });

export default mongoose.model<IUser>('User', UserSchema);
