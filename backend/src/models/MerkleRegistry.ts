import mongoose, { Document, Schema } from 'mongoose';

export interface IMerkleRegistry extends Document {
    userId: mongoose.Types.ObjectId;
    merkleRoot: string;
}

const MerkleRegistrySchema: Schema = new Schema({
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    merkleRoot: { type: String, required: true },
}, { timestamps: true });

export default mongoose.model<IMerkleRegistry>('MerkleRegistry', MerkleRegistrySchema);
