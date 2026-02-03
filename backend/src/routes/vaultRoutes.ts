import express from 'express';
import { uploadInit, getUserFiles, getFile, downloadFile, uploadChunk, deleteUserFile, getStorageStats } from '../controllers/vaultController';
import { protect } from '../middleware/authMiddleware';

const router = express.Router();

// All vault routes require authentication
router.post('/upload-init', protect, uploadInit);
// Route is now /upload-chunk
router.put('/upload-chunk', protect, (req, res, next) => {
    // Determine fileId from query
    if (!req.query.fileId) {
        res.status(400).json({ message: 'Missing fileId' });
        return;
    }
    next();
}, uploadChunk as any);
router.get('/files', protect, getUserFiles);
router.get('/files/:id', protect, getFile);
router.get('/download/:id', protect, downloadFile);
router.delete('/files/:id', protect, deleteUserFile);
router.get('/storage-stats', protect, getStorageStats);

export default router;
