const mongoose = require('mongoose');
const argon2 = require('argon2');

const UserSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true },
    pqcPublicKey: { type: String, required: true },
    passwordHash: { type: String, required: true },
});

const User = mongoose.model('TestUser', UserSchema);

async function runTest() {
    try {
        await mongoose.connect('mongodb://localhost:27017/aegis_test');
        console.log('Connected to test DB');

        await User.deleteMany({});

        const clientHash = 'test_hash'; // Simulate SHA-256 hash from client
        const email = 'test@example.com';
        const pqcPublicKey = 'test_pqc';

        // Register
        const passwordHash = await argon2.hash(clientHash);
        await User.create({ email, pqcPublicKey, passwordHash });
        console.log('User created');

        // Login success
        const user = await User.findOne({ email });
        const isMatch = await argon2.verify(user.passwordHash, clientHash);
        console.log('Correct password match:', isMatch);

        // Login failure
        const isMatchFail = await argon2.verify(user.passwordHash, 'wrong_hash');
        console.log('Wrong password match:', isMatchFail);

        await mongoose.disconnect();
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

runTest();
