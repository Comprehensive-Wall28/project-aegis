import { Router } from 'express';
import {
    createRoom,
    getUserRooms,
    createInvite,
    getInviteInfo,
    joinRoom,
    postLink,
    getRoomContent,
    getCollectionLinks,
    deleteLink,
    createCollection,
    deleteCollection,
    updateCollection,
    reorderCollections,
    moveLink,
    markLinkViewed,
    unmarkLinkViewed,
    getComments,
    postComment,
    deleteComment,
    searchRoomLinks,
    getReaderContent,
    getAnnotations,
    createAnnotation,
    deleteAnnotation,
    leaveRoom,
    deleteRoom
} from '../controllers/socialController';
import { proxyImage } from '../controllers/linkPreviewController';
import { protect } from '../middleware/authMiddleware';
import { csrfProtection } from '../middleware/customCsrf';

const router = Router();

// Public endpoint - no auth required
router.get('/invite/:inviteCode', getInviteInfo);
router.get('/proxy-image', proxyImage);

// Protected routes - require auth and CSRF
router.get('/rooms', protect, csrfProtection, getUserRooms);
router.post('/rooms', protect, csrfProtection, createRoom);
router.post('/rooms/:roomId/invite', protect, csrfProtection, createInvite);
router.post('/rooms/join', protect, csrfProtection, joinRoom);
router.post('/rooms/:roomId/leave', protect, csrfProtection, leaveRoom);
router.delete('/rooms/:roomId', protect, csrfProtection, deleteRoom);
router.post('/rooms/:roomId/links', protect, csrfProtection, postLink);
router.post('/rooms/:roomId/collections', protect, csrfProtection, createCollection);
router.get('/rooms/:roomId', protect, csrfProtection, getRoomContent);
router.get('/rooms/:roomId/collections/:collectionId/links', protect, csrfProtection, getCollectionLinks);
router.get('/rooms/:roomId/search', protect, csrfProtection, searchRoomLinks);
router.delete('/links/:linkId', protect, csrfProtection, deleteLink);
router.delete('/collections/:collectionId', protect, csrfProtection, deleteCollection);
router.patch('/collections/:collectionId', protect, csrfProtection, updateCollection);
router.patch('/rooms/:roomId/collections/order', protect, csrfProtection, reorderCollections);
router.patch('/links/:linkId', protect, csrfProtection, moveLink);
router.post('/links/:linkId/view', protect, csrfProtection, markLinkViewed);
router.delete('/links/:linkId/view', protect, csrfProtection, unmarkLinkViewed);
router.get('/links/:linkId/comments', protect, csrfProtection, getComments);
router.post('/links/:linkId/comments', protect, csrfProtection, postComment);
router.delete('/comments/:commentId', protect, csrfProtection, deleteComment);

// Reader mode routes
router.get('/links/:linkId/reader', protect, csrfProtection, getReaderContent);
router.get('/links/:linkId/annotations', protect, csrfProtection, getAnnotations);
router.post('/links/:linkId/annotations', protect, csrfProtection, createAnnotation);
router.delete('/annotations/:annotationId', protect, csrfProtection, deleteAnnotation);

export default router;
