import { Router } from 'express';
import { updateGPA, verifyGPA, getMerkleRoot, getGPALogs, verifyIntegrity } from '../controllers/integrityController';
import { protect } from '../middleware/authMiddleware';
import { csrfProtection } from '../middleware/csrfMiddleware';

const router = Router();

// All routes require authentication and CSRF protection
router.post('/update-gpa', protect, csrfProtection, updateGPA);
router.get('/verify-gpa', protect, csrfProtection, verifyGPA);
router.get('/verify', protect, csrfProtection, verifyIntegrity);
router.get('/merkle-root', protect, csrfProtection, getMerkleRoot);
router.get('/gpa-logs', protect, csrfProtection, getGPALogs);

export default router;
