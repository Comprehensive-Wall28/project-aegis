import express from 'express';
import { uploadInit, getUserFiles } from '../controllers/vaultController';
import { protect } from '../middleware/authMiddleware';

const router = express.Router();

router.post('/upload-init', protect, uploadInit);
router.get('/files', protect, getUserFiles);

export default router;
