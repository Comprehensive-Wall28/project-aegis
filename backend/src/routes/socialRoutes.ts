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

const router = Router();

// Public endpoint - no auth required
router.get('/invite/:inviteCode', getInviteInfo);
router.get('/proxy-image', proxyImage);

// Protected routes - require auth
router.get('/rooms', protect, getUserRooms);
router.post('/rooms', protect, createRoom);
router.post('/rooms/:roomId/invite', protect, createInvite);
router.post('/rooms/join', protect, joinRoom);
router.post('/rooms/:roomId/leave', protect, leaveRoom);
router.delete('/rooms/:roomId', protect, deleteRoom);
router.post('/rooms/:roomId/links', protect, postLink);
router.post('/rooms/:roomId/collections', protect, createCollection);
router.get('/rooms/:roomId', protect, getRoomContent);
router.get('/rooms/:roomId/collections/:collectionId/links', protect, getCollectionLinks);
router.get('/rooms/:roomId/search', protect, searchRoomLinks);
router.delete('/links/:linkId', protect, deleteLink);
router.delete('/collections/:collectionId', protect, deleteCollection);
router.patch('/collections/:collectionId', protect, updateCollection);
router.patch('/rooms/:roomId/collections/order', protect, reorderCollections);
router.patch('/links/:linkId', protect, moveLink);
router.post('/links/:linkId/view', protect, markLinkViewed);
router.delete('/links/:linkId/view', protect, unmarkLinkViewed);
router.get('/links/:linkId/comments', protect, getComments);
router.post('/links/:linkId/comments', protect, postComment);
router.delete('/comments/:commentId', protect, deleteComment);

// Reader mode routes
router.get('/links/:linkId/reader', protect, getReaderContent);
router.get('/links/:linkId/annotations', protect, getAnnotations);
router.post('/links/:linkId/annotations', protect, createAnnotation);
router.delete('/annotations/:annotationId', protect, deleteAnnotation);

export default router;
