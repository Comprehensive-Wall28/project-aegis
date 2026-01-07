import express from 'express';
import { registerUser, loginUser, getMe, updateMe, logoutUser, getCsrfToken } from '../controllers/authController';
import { protect } from '../middleware/authMiddleware';

const router = express.Router();

router.post('/register', registerUser);
router.post('/login', loginUser);
router.get('/me', protect, getMe);
router.put('/me', protect, updateMe);
router.post('/logout', logoutUser);
router.get('/csrf-token', getCsrfToken);

export default router;
