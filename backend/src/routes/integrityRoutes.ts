import { Router } from 'express';
import { updateGPA, verifyGPA, getMerkleRoot, getGPALogs } from '../controllers/integrityController';
import { protect } from '../middleware/authMiddleware';

const router = Router();

router.post('/update-gpa', updateGPA);
router.get('/verify', verifyGPA);
router.get('/merkle-root', protect, getMerkleRoot);
router.get('/gpa-logs', protect, getGPALogs);

export default router;
