import express from 'express';
import {
    registerUser,
    loginUser,
    getMe,
    updateMe,
    logoutUser,
    getCsrfToken,
    getRegistrationOptions,
    verifyRegistration,
    getAuthenticationOptions,
    verifyAuthentication,
    removePasskey,
    discoverUser,
} from '../controllers/authController';
import { protect } from '../middleware/authMiddleware';
import { csrfProtection, csrfTokenCookie } from '../middleware/customCsrf';

const router = express.Router();

// Public routes - NO CSRF protection (prevents race condition on fresh page loads)
// These are protected by rate limiting instead
router.post('/register', registerUser);
router.post('/login', loginUser);

// CSRF token endpoint - applies CSRF to set the cookie, then returns the token
router.get('/csrf-token', csrfProtection, csrfTokenCookie, getCsrfToken);

// Protected routes WITH CSRF protection
router.get('/me', protect, csrfProtection, getMe);
router.put('/me', protect, csrfProtection, updateMe);
router.get('/discovery/:email', protect, csrfProtection, discoverUser);

// Logout - no CSRF (cookie might be stale, and logout is low-risk)
router.post('/logout', logoutUser);

// WebAuthn routes
router.post('/webauthn/register-options', protect, csrfProtection, getRegistrationOptions);
router.post('/webauthn/register-verify', protect, csrfProtection, verifyRegistration);
router.post('/webauthn/login-options', getAuthenticationOptions);
router.post('/webauthn/login-verify', verifyAuthentication);
router.delete('/webauthn/passkey', protect, csrfProtection, removePasskey);

export default router;
