import { Router } from 'express';
import { updateGPA, verifyGPA } from '../controllers/integrityController';

const router = Router();

router.post('/update-gpa', updateGPA);
router.get('/verify', verifyGPA);

export default router;
