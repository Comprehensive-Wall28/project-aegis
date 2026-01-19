import mongoose, { Document, Schema } from 'mongoose';

export interface IUserPreferences {
    sessionTimeout: number; // minutes
    encryptionLevel: 'STANDARD' | 'HIGH' | 'PARANOID';
    backgroundImage?: string | null;
    backgroundBlur?: number;
    backgroundOpacity?: number;
}

export interface IWebAuthnCredential {
    credentialID: string;
    publicKey: string;
    counter: number;
    transports?: string[];
}

export interface IUser extends Document {
    username: string;
    email: string;
    pqcPublicKey: string;
    passwordHash?: string;
    gpaSystem: 'NORMAL' | 'GERMAN';
    preferences: IUserPreferences;
    webauthnCredentials: IWebAuthnCredential[];
    passwordHashVersion: number;
    currentChallenge?: string;
    totalStorageUsed: number;
}

const UserSchema: Schema = new Schema({

    username: { type: String, required: true, unique: true },

    email: { type: String, required: true, unique: true },

    pqcPublicKey: { type: String, required: true },

    passwordHash: {
        type: String,
        required: true
    },

    passwordHashVersion: {
        type: Number,
        default: 1 // 1: SHA-256 (Legacy), 2: Argon2 (New)
    },

    gpaSystem: { type: String, enum: ['NORMAL', 'GERMAN'], default: 'NORMAL' },

    preferences: {
        sessionTimeout: { type: Number, default: 60, min: 5, max: 480 },
        encryptionLevel: { type: String, enum: ['STANDARD', 'HIGH', 'PARANOID'], default: 'STANDARD' },
        backgroundImage: { type: String, default: null },
        backgroundBlur: { type: Number, default: 8, min: 0, max: 20 },
        backgroundOpacity: { type: Number, default: 0.4, min: 0, max: 1 }
    },

    webauthnCredentials: [{
        credentialID: { type: String, required: true },
        publicKey: { type: String, required: true },
        counter: { type: Number, required: true, default: 0 },
        transports: [{ type: String }]
    }],

    currentChallenge: { type: String },

    totalStorageUsed: { type: Number, default: 0, min: 0 }

}, { timestamps: true });

export default mongoose.model<IUser>('User', UserSchema);
