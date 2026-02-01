import express from 'express';
import { getDashboardActivity } from '../controllers/activityController';
import { protect } from '../middleware/authMiddleware';

const router = express.Router();

router.use(protect);

router.get('/dashboard', getDashboardActivity);

export default router;
