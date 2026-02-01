import { Router } from 'express';
import { getBacklinks } from '../controllers/mentionController';
import { protect } from '../middleware/authMiddleware';

const router = Router();

// All mention routes require authentication
router.use(protect);

/**
 * @route   GET /api/mentions/backlinks
 * @desc    Get all entities that mention a specific target ID
 * @access  Private
 */
router.get('/backlinks', getBacklinks);

export default router;
