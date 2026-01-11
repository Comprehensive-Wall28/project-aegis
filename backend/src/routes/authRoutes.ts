import express from 'express';
import { registerUser, loginUser, getMe, updateMe, logoutUser, getCsrfToken } from '../controllers/authController';
import { protect } from '../middleware/authMiddleware';
import { csrfProtection, csrfTokenCookie } from '../middleware/csrfMiddleware';

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

// Logout - no CSRF (cookie might be stale, and logout is low-risk)
router.post('/logout', logoutUser);

export default router;
