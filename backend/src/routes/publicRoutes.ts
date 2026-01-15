import express from 'express';
import { getLinkMetadata, downloadSharedFile } from '../controllers/publicShareController';
import { apiLimiter } from '../middleware/rateLimiter';

const router = express.Router();

// Apply rate limiting specifically for public access to prevent enumeration/abuse
router.use(apiLimiter);

router.get('/share/:token', getLinkMetadata);
router.get('/share/:token/download', downloadSharedFile);

export default router;
