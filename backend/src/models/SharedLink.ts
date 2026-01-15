import mongoose, { Document, Schema } from 'mongoose';

export interface ISharedLink extends Document {
    token: string;
    resourceId: mongoose.Types.ObjectId;
    resourceType: 'file' | 'folder';
    encryptedKey: string; // The file/folder key, encrypted with the link's secret (hash)
    creatorId: mongoose.Types.ObjectId;
    views: number;
    expiresAt?: Date;
    isPublic: boolean;
    allowedEmails: string[]; // For restricted links, only these emails can access (after login)
}

const SharedLinkSchema: Schema = new Schema({
    token: { type: String, required: true, unique: true },
    resourceId: { type: Schema.Types.ObjectId, required: true, refPath: 'resourceModel' },
    resourceType: { type: String, required: true, enum: ['file', 'folder'] },
    encryptedKey: { type: String, required: true },
    creatorId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    views: { type: Number, default: 0 },
    expiresAt: { type: Date },
    isPublic: { type: Boolean, default: false },
    allowedEmails: { type: [String], default: [] }
}, { timestamps: true });

// Virtual to help population
SharedLinkSchema.virtual('resourceModel').get(function (this: ISharedLink) {
    return this.resourceType === 'file' ? 'FileMetadata' : 'Folder';
});

export default mongoose.model<ISharedLink>('SharedLink', SharedLinkSchema);
