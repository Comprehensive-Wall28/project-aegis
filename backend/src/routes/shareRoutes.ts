import express from 'express';
import { invite, inviteFile, getSharedWithMe, getSharedFolderKey, getSharedFileKey, createLink, getMyLinks, revokeLink } from '../controllers/shareController';
import { protect } from '../middleware/authMiddleware';

const router = express.Router();

// All share routes are protected
router.use(protect);


router.post('/invite', invite);
router.post('/invite-file', inviteFile);
router.post('/link', createLink);
router.get('/my-links', getMyLinks);
router.delete('/link/:id', revokeLink);
router.get('/shared-with-me', getSharedWithMe);
router.get('/shared-folder/:folderId', getSharedFolderKey);
router.get('/shared-file/:fileId', getSharedFileKey);


export default router;
