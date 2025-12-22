import mongoose, { Document, Schema } from 'mongoose';

export interface IUser extends Document {
    email: string;
    pqcPublicKey: string;
    passwordHash: string;
}

const UserSchema: Schema = new Schema({

    email: { type: String, required: true, unique: true },

    pqcPublicKey: { type: String, required: true },

    passwordHash: { type: String, required: true },
    
}, { timestamps: true });

export default mongoose.model<IUser>('User', UserSchema);
