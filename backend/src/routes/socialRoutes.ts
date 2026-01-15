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
    deleteCollection,
    moveLink,
    markLinkViewed,
    getComments,
    postComment,
    deleteComment
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
router.delete('/collections/:collectionId', protect, csrfProtection, deleteCollection);
router.patch('/links/:linkId/move', protect, csrfProtection, moveLink);
router.post('/links/:linkId/view', protect, csrfProtection, markLinkViewed);
router.get('/links/:linkId/comments', protect, csrfProtection, getComments);
router.post('/links/:linkId/comments', protect, csrfProtection, postComment);
router.delete('/comments/:commentId', protect, csrfProtection, deleteComment);

export default router;
