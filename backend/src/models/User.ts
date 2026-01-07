import mongoose, { Document, Schema } from 'mongoose';

export interface IUserPreferences {
    sessionTimeout: number; // minutes
    encryptionLevel: 'STANDARD' | 'HIGH' | 'PARANOID';
}

export interface IUser extends Document {
    username: string;
    email: string;
    pqcPublicKey: string;
    passwordHash: string;
    gpaSystem: 'NORMAL' | 'GERMAN';
    preferences: IUserPreferences;
}

const UserSchema: Schema = new Schema({

    username: { type: String, required: true, unique: true },

    email: { type: String, required: true, unique: true },

    pqcPublicKey: { type: String, required: true },

    passwordHash: { type: String, required: true },

    gpaSystem: { type: String, enum: ['NORMAL', 'GERMAN'], default: 'NORMAL' },

    preferences: {
        sessionTimeout: { type: Number, default: 60, min: 5, max: 480 },
        encryptionLevel: { type: String, enum: ['STANDARD', 'HIGH', 'PARANOID'], default: 'STANDARD' }
    }

}, { timestamps: true });

export default mongoose.model<IUser>('User', UserSchema);
