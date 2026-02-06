import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type UserDocument = User & Document;

@Schema({ _id: false })
export class UserPreferences {
    @Prop({ type: Number, default: 60, min: 5, max: 480 })
    sessionTimeout: number;

    @Prop({ type: String, enum: ['STANDARD', 'HIGH', 'PARANOID'], default: 'STANDARD' })
    encryptionLevel: string;

    @Prop({ type: String, default: null })
    backgroundImage?: string | null;

    @Prop({ type: Number, default: 8, min: 0, max: 20 })
    backgroundBlur: number;

    @Prop({ type: Number, default: 0.4, min: 0, max: 1 })
    backgroundOpacity: number;
}

@Schema({ _id: false })
export class WebAuthnCredential {
    @Prop({ required: true })
    credentialID: string;

    @Prop({ required: true })
    publicKey: string;

    @Prop({ required: true, default: 0 })
    counter: number;

    @Prop({ type: [String] })
    transports?: string[];
}

@Schema({ timestamps: true })
export class User {
    @Prop({ required: true, unique: true })
    username: string;

    @Prop({ required: true, unique: true })
    email: string;

    @Prop({ required: true })
    pqcPublicKey: string;

    @Prop({ required: true })
    passwordHash: string;

    @Prop({ default: 1 }) // 1: SHA-256 (Legacy), 2: Argon2 (New)
    passwordHashVersion: number;

    @Prop({ default: 0 }) // Incremented on logout to invalidate all existing tokens
    tokenVersion: number;

    @Prop({ enum: ['NORMAL', 'GERMAN'], default: 'NORMAL' })
    gpaSystem: string;

    @Prop({ type: UserPreferences, default: () => ({}) })
    preferences: UserPreferences;

    @Prop({ type: [WebAuthnCredential], default: [] })
    webauthnCredentials: WebAuthnCredential[];

    @Prop()
    currentChallenge?: string;

    @Prop({ default: 0, min: 0 })
    totalStorageUsed: number;
}

export const UserSchema = SchemaFactory.createForClass(User);

// Indexes
UserSchema.index({ 'webauthnCredentials.credentialID': 1 });
