import express from 'express';
import { uploadInit, getUserFiles, downloadFile, uploadChunk, deleteUserFile } from '../controllers/vaultController';
import { protect } from '../middleware/authMiddleware';

const router = express.Router();

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
router.get('/download/:id', protect, downloadFile);
router.delete('/files/:id', protect, deleteUserFile);

export default router;

