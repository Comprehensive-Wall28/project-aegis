import express from 'express';
import { inviteFile, getSharedFileKey, createLink, getMyLinks, revokeLink } from '../controllers/shareController';
import { protect } from '../middleware/authMiddleware';

const router = express.Router();

// All share routes are protected
router.use(protect);



router.post('/invite-file', inviteFile);
router.post('/link', createLink);
router.get('/my-links', getMyLinks);
router.delete('/link/:id', revokeLink);

router.get('/shared-file/:fileId', getSharedFileKey);


export default router;
