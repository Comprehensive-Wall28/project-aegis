import express from 'express';
import { invite, getSharedWithMe, getSharedFolderKey } from '../controllers/shareController';
import { protect } from '../middleware/authMiddleware';

const router = express.Router();

// All share routes are protected
router.use(protect);

router.post('/invite', invite);
router.get('/shared-with-me', getSharedWithMe);
router.get('/shared-folder/:folderId', getSharedFolderKey);


export default router;
