import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export enum EncryptionLevel {
    STANDARD = 'STANDARD',
    HIGH = 'HIGH',
    PARANOID = 'PARANOID'
}

export enum GpaSystem {
    NORMAL = 'NORMAL',
    GERMAN = 'GERMAN'
}

@Schema({ _id: false })
export class UserPreferences {
    @Prop({ type: Number, default: 60, min: 5, max: 480 })
    sessionTimeout: number;

    @Prop({ type: String, enum: EncryptionLevel, default: EncryptionLevel.STANDARD })
    encryptionLevel: EncryptionLevel;

    @Prop({ type: String, default: null })
    backgroundImage: string | null;

    @Prop({ type: Number, default: 8, min: 0, max: 20 })
    backgroundBlur: number;

    @Prop({ type: Number, default: 0.4, min: 0, max: 1 })
    backgroundOpacity: number;
}

@Schema({ _id: false })
export class WebAuthnCredential {
    @Prop({ type: String, required: true })
    credentialID: string;

    @Prop({ type: String, required: true })
    publicKey: string;

    @Prop({ type: Number, required: true, default: 0 })
    counter: number;

    @Prop({ type: [String] })
    transports: string[];
}

@Schema({ timestamps: true })
export class User extends Document {
    @Prop({ type: String, required: true, unique: true })
    username: string;

    @Prop({ type: String, required: true, unique: true })
    email: string;

    @Prop({ type: String, required: true })
    pqcPublicKey: string;

    @Prop({ type: String, required: true })
    passwordHash: string;

    @Prop({ type: Number, default: 1 })
    passwordHashVersion: number;

    @Prop({ type: Number, default: 0 })
    tokenVersion: number;

    @Prop({ type: String, enum: GpaSystem, default: GpaSystem.NORMAL })
    gpaSystem: GpaSystem;

    @Prop({ type: UserPreferences, default: () => ({}) })
    preferences: UserPreferences;

    @Prop({ type: [WebAuthnCredential], default: [] })
    webauthnCredentials: WebAuthnCredential[];

    @Prop({ type: String })
    currentChallenge?: string;

    @Prop({ type: Number, default: 0, min: 0 })
    totalStorageUsed: number;
}

export const UserSchema = SchemaFactory.createForClass(User);

// Indexes
UserSchema.index({ 'webauthnCredentials.credentialID': 1 });
