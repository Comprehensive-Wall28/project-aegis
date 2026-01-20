import express from 'express';
import { uploadInit, getUserFiles, getFile, downloadFile, uploadChunk, deleteUserFile, getStorageStats } from '../controllers/vaultController';
import { protect } from '../middleware/authMiddleware';
import { csrfProtection } from '../middleware/csrfMiddleware';

const router = express.Router();

// All vault routes require authentication and CSRF protection
router.post('/upload-init', protect, csrfProtection, uploadInit);
// Route is now /upload-chunk
router.put('/upload-chunk', protect, csrfProtection, (req, res, next) => {
    // Determine fileId from query
    if (!req.query.fileId) {
        res.status(400).json({ message: 'Missing fileId' });
        return;
    }
    next();
}, uploadChunk as any);
router.get('/files', protect, csrfProtection, getUserFiles);
router.get('/files/:id', protect, csrfProtection, getFile);
router.get('/download/:id', protect, csrfProtection, downloadFile);
router.delete('/files/:id', protect, csrfProtection, deleteUserFile);
router.get('/storage-stats', protect, csrfProtection, getStorageStats);

export default router;
