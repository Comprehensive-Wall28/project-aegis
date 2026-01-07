import { Router } from 'express';
import { getAuditLogs, getRecentActivity } from '../controllers/auditController';
import { protect } from '../middleware/authMiddleware';

const router = Router();

// All audit routes require authentication
router.get('/', protect, getAuditLogs);
router.get('/recent', protect, getRecentActivity);

export default router;
