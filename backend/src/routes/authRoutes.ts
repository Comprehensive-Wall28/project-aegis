import express from 'express';
import {
    registerUser,
    loginUser,
    getMe,
    updateMe,
    logoutUser,
    getRegistrationOptions,
    verifyRegistration,
    getAuthenticationOptions,
    verifyAuthentication,
    removePasskey,
    discoverUser,
} from '../controllers/authController';
import { protect } from '../middleware/authMiddleware';

const router = express.Router();

// Public routes - NO CSRF protection (prevents race condition on fresh page loads)
router.post('/register', registerUser);
router.post('/login', loginUser);



// Protected routes
router.get('/me', protect, getMe);
router.put('/me', protect, updateMe);
router.get('/discovery/:email', protect, discoverUser);

// Logout - protected to get user ID for token invalidation
router.post('/logout', protect, logoutUser);

// WebAuthn routes
router.post('/webauthn/register-options', protect, getRegistrationOptions);
router.post('/webauthn/register-verify', protect, verifyRegistration);
router.post('/webauthn/login-options', getAuthenticationOptions);
router.post('/webauthn/login-verify', verifyAuthentication);
router.delete('/webauthn/passkey', protect, removePasskey);

export default router;
