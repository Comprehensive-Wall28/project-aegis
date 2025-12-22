import express from 'express';
import { uploadInit, getUserFiles, downloadFile } from '../controllers/vaultController';
import { protect } from '../middleware/authMiddleware';

const router = express.Router();

router.post('/upload-init', protect, uploadInit);
router.get('/files', protect, getUserFiles);
router.get('/download/:id', protect, downloadFile);

export default router;
