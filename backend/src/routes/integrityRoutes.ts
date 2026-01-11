import { Router } from 'express';
import { updateGPA, verifyGPA, getMerkleRoot, getGPALogs, verifyIntegrity } from '../controllers/integrityController';
import { protect } from '../middleware/authMiddleware';

const router = Router();

router.post('/update-gpa', protect, updateGPA);
router.get('/verify-gpa', protect, verifyGPA);
router.get('/verify', protect, verifyIntegrity); // New endpoint for authenticated users
router.get('/merkle-root', protect, getMerkleRoot);
router.get('/gpa-logs', protect, getGPALogs);

export default router;

