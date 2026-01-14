import { Router } from 'express';
import {
    createRoom,
    getUserRooms,
    createInvite,
    getInviteInfo,
    joinRoom,
    postLink,
    getRoomContent,
    deleteLink,
    createCollection,
    moveLink
} from '../controllers/socialController';
import { protect } from '../middleware/authMiddleware';
import { csrfProtection } from '../middleware/csrfMiddleware';

const router = Router();

// Public endpoint - no auth required
router.get('/invite/:inviteCode', getInviteInfo);

// Protected routes - require auth and CSRF
router.get('/rooms', protect, csrfProtection, getUserRooms);
router.post('/rooms', protect, csrfProtection, createRoom);
router.post('/rooms/:roomId/invite', protect, csrfProtection, createInvite);
router.post('/rooms/join', protect, csrfProtection, joinRoom);
router.post('/rooms/:roomId/links', protect, csrfProtection, postLink);
router.post('/rooms/:roomId/collections', protect, csrfProtection, createCollection);
router.get('/rooms/:roomId', protect, csrfProtection, getRoomContent);
router.delete('/links/:linkId', protect, csrfProtection, deleteLink);
router.patch('/links/:linkId/move', protect, csrfProtection, moveLink);

export default router;
