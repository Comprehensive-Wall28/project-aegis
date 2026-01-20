import mongoose from 'mongoose';
import argon2 from 'argon2';
import User from '../src/models/User';
import { AuthService } from '../src/services/AuthService';
import { config } from '../src/config/env';
import { Request } from 'express';

async function verifyMigration() {
    console.log('--- Starting Hash Migration Verification ---');

    // 1. Connect to DB
    await mongoose.connect(config.mongoUri);
    console.log('Connected to MongoDB');

    const authService = new AuthService();
    const testEmail = 'migration_test@example.com';
    const passwordRaw = 'securePassword123';

    // Cleanup
    await User.deleteOne({ email: testEmail });

    // 2. Simulate Legacy User (Version 1)
    // In version 1, front-end sent SHA-256 of password
    const legacyFrontendHash = 'd7a8fbb307d7809469ca9abcb3e0e8f06f51b7959651fb9c922579b291d24cf6'; // SHA-256 of securePassword123
    const legacyServerHash = await argon2.hash(legacyFrontendHash);

    const legacyUser = await User.create({
        username: 'migration_test',
        email: testEmail,
        pqcPublicKey: 'dummy_pqc_key',
        passwordHash: legacyServerHash,
        passwordHashVersion: 1
    });
    console.log('Created legacy user with version 1 hash');

    // 3. Perform Login with Migration
    // New frontend sends both Argon2 and legacy SHA-256
    const newArgon2Hash = 'dummy_argon2_client_hash'; // In reality this is a long argon2 string

    const mockReq = {
        headers: { 'user-agent': 'test-agent' },
        ip: '127.0.0.1'
    } as unknown as Request;

    console.log('Attempting login with migration (sending both hashes)...');
    await authService.login({
        email: testEmail,
        argon2Hash: newArgon2Hash,
        legacyHash: legacyFrontendHash
    }, mockReq, () => { });

    // 4. Verify Migration Status
    const updatedUser = await User.findOne({ email: testEmail });
    if (updatedUser?.passwordHashVersion === 2) {
        console.log('SUCCESS: User upgraded to version 2');
    } else {
        console.error('FAILURE: User NOT upgraded to version 2');
        process.exit(1);
    }

    // 5. Verify subsequent login ONLY needs Argon2 hash
    console.log('Verifying subsequent login with only Argon2 hash...');
    try {
        await authService.login({
            email: testEmail,
            argon2Hash: newArgon2Hash
        }, mockReq, () => { });
        console.log('SUCCESS: Subsequent login successful');
    } catch (err) {
        console.error('FAILURE: Subsequent login failed:', err);
        process.exit(1);
    }

    // 6. Verify legacy login fails if no argon2Hash provided (or incorrect)
    console.log('Verifying that legacy login with WRONG Argon2 hash fails...');
    try {
        await authService.login({
            email: testEmail,
            argon2Hash: 'wrong_argon2_hash'
        }, mockReq, () => { });
        console.error('FAILURE: Login should have failed');
        process.exit(1);
    } catch (err) {
        console.log('SUCCESS: Login failed as expected');
    }

    console.log('--- Verification Complete ---');
    await mongoose.disconnect();
}

verifyMigration().catch(err => {
    console.error('Verification failed:', err);
    process.exit(1);
});
