import { Router } from 'express';
import { getAuditLogs, getRecentActivity } from '../controllers/auditController';
import { protect } from '../middleware/authMiddleware';
import { csrfProtection } from '../middleware/csrfMiddleware';

const router = Router();

// All audit routes require authentication and CSRF protection
router.get('/', protect, csrfProtection, getAuditLogs);
router.get('/recent', protect, csrfProtection, getRecentActivity);

export default router;
