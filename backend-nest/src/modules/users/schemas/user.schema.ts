import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { ServiceError } from '../../../common/services/base.service';

@Schema({ timestamps: true })
export class User {
  @Prop({ required: true, unique: true, trim: true, minlength: 3 })
  username!: string;

  @Prop({ required: true, unique: true, trim: true, lowercase: true })
  email!: string;

  @Prop({ required: true })
  pqcPublicKey!: string;

  @Prop({ required: true })
  passwordHash!: string;

  @Prop({ default: false })
  isEmailVerified!: boolean;

  @Prop({ default: 0 })
  totalStorageUsed!: number;

  @Prop({ default: 2 })
  passwordHashVersion!: number;

  @Prop({
    type: {
      sessionTimeout: { type: Number, default: 60, min: 5, max: 480 },
      encryptionLevel: {
        type: String,
        enum: ['STANDARD', 'HIGH', 'PARANOID'],
        default: 'STANDARD',
      },
      backgroundImage: { type: String, default: null },
      backgroundBlur: { type: Number, default: 8, min: 0, max: 20 },
      backgroundOpacity: { type: Number, default: 0.4, min: 0, max: 1 },
    },
    default: {},
  })
  preferences!: {
    sessionTimeout: number;
    encryptionLevel: string;
    backgroundImage?: string | null;
    backgroundBlur?: number;
    backgroundOpacity?: number;
  };

  @Prop({ default: 'NORMAL', enum: ['NORMAL', 'GERMAN'] })
  gpaSystem!: string;

  @Prop([
    {
      credentialID: { type: String, required: true },
      publicKey: { type: String, required: true },
      counter: { type: Number, required: true },
      transports: { type: [String], default: [] },
    },
  ])
  webauthnCredentials!: {
    credentialID: string;
    publicKey: string;
    counter: number;
    transports: string[];
  }[];

  @Prop()
  currentChallenge?: string;
}

export type UserDocument = User & Document;
export const UserSchema = SchemaFactory.createForClass(User);
