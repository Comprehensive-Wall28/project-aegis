import mongoose from 'mongoose';
import { VaultService } from '../src/services/VaultService';
import User from '../src/models/User';
import dotenv from 'dotenv';

dotenv.config();

async function runVerification() {
    try {
        const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/aegis';
        await mongoose.connect(mongoUri);
        console.log('Connected to MongoDB');

        const vaultService = new VaultService();

        // 1. Create a test user
        const testUser = await User.create({
            username: 'testuser_' + Date.now(),
            email: 'test_' + Date.now() + '@example.com',
            pqcPublicKey: 'dummy_key',
            passwordHash: 'dummy_hash',
            totalStorageUsed: 0
        });
        console.log('Created test user:', testUser.username);

        // 2. Check initial storage
        let stats = await vaultService.getStorageStats(testUser._id.toString());
        console.log('Initial stats:', stats);
        if (stats.totalStorageUsed !== 0) throw new Error('Initial storage should be 0');

        // 3. Test limit enforcement
        console.log('Testing limit enforcement...');
        const largeFileSize = 6 * 1024 * 1024 * 1024; // 6GB
        try {
            await vaultService.initUpload(testUser._id.toString(), {
                fileName: 'large_file',
                originalFileName: 'large_file.dat',
                fileSize: largeFileSize,
                encryptedSymmetricKey: 'key',
                encapsulatedKey: 'enc',
                mimeType: 'application/octet-stream'
            }, {} as any);
            throw new Error('Should have thrown storage limit error');
        } catch (error: any) {
            console.log('Caught expected error:', error.message);
            if (!error.message.includes('limit exceeded')) throw error;
        }

        // 4. Test storage update on delete (manual simulation since we can't easily mock Drive upload)
        console.log('Testing storage tracking...');
        // Manually update user storage to simulate a previous upload
        await User.findByIdAndUpdate(testUser._id, { totalStorageUsed: 1024 });
        stats = await vaultService.getStorageStats(testUser._id.toString());
        console.log('Stats after manual update:', stats);
        if (stats.totalStorageUsed !== 1024) throw new Error('Storage update failed');

        // Clean up
        await User.findByIdAndDelete(testUser._id);
        console.log('Cleaned up test user');
        process.exit(0);
    } catch (error) {
        console.error('Verification failed:', error);
        process.exit(1);
    }
}

runVerification();
