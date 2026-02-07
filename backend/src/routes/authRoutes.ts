import express from 'express';
import {
    registerUser,
    loginUser,
    getMe,
    updateMe,
    logoutUser,
    getCsrfToken,
    discoverUser,
} from '../controllers/authController';
import { protect } from '../middleware/authMiddleware';
import { csrfProtection, csrfTokenCookie } from '../middleware/customCsrf';

import { authLimiter } from '../middleware/rateLimiter';

const router = express.Router();

// Public routes - NO CSRF protection (prevents race condition on fresh page loads)
router.post('/register', authLimiter, registerUser);
router.post('/login', authLimiter, loginUser);

// CSRF token endpoint - applies CSRF to set the cookie, then returns the token
router.get('/csrf-token', csrfProtection, csrfTokenCookie, getCsrfToken);

// Protected routes WITH CSRF protection
router.get('/me', protect, csrfProtection, getMe);
router.put('/me', protect, csrfProtection, updateMe);
router.get('/discovery/:email', protect, csrfProtection, discoverUser);

// Logout - protected to get user ID for token invalidation, no CSRF (cookie might be stale)
router.post('/logout', protect, logoutUser);


export default router;
