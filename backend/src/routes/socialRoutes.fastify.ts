import { FastifyInstance } from 'fastify';
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

/**
 * Social Routes - Rooms, links, collections, comments, annotations
 * 28 endpoints total (2 public + 26 protected)
 */
export default async function socialRoutes(fastify: FastifyInstance) {
    const preHandler = [fastify.authenticate, fastify.csrfProtection];
    
    // Public endpoints - no auth required
    fastify.get('/invite/:inviteCode', {}, getInviteInfo);
    // Image proxy endpoint - has retry logic for slow/unreliable image sources
    fastify.get('/proxy-image', {}, proxyImage);
    
    // Protected routes - require auth and CSRF
    // Room management
    fastify.get('/rooms', { preHandler }, getUserRooms);
    fastify.post('/rooms', { preHandler }, createRoom);
    fastify.post('/rooms/:roomId/invite', { preHandler }, createInvite);
    fastify.post('/rooms/join', { preHandler }, joinRoom);
    fastify.post('/rooms/:roomId/leave', { preHandler }, leaveRoom);
    fastify.delete('/rooms/:roomId', { preHandler }, deleteRoom);
    fastify.get('/rooms/:roomId', { preHandler }, getRoomContent);
    fastify.get('/rooms/:roomId/search', { preHandler }, searchRoomLinks);
    
    // Links
    fastify.post('/rooms/:roomId/links', { preHandler }, postLink);
    fastify.delete('/links/:linkId', { preHandler }, deleteLink);
    fastify.patch('/links/:linkId', { preHandler }, moveLink);
    fastify.post('/links/:linkId/view', { preHandler }, markLinkViewed);
    fastify.delete('/links/:linkId/view', { preHandler }, unmarkLinkViewed);
    
    // Collections
    fastify.post('/rooms/:roomId/collections', { preHandler }, createCollection);
    fastify.get('/rooms/:roomId/collections/:collectionId/links', { preHandler }, getCollectionLinks);
    fastify.delete('/collections/:collectionId', { preHandler }, deleteCollection);
    fastify.patch('/collections/:collectionId', { preHandler }, updateCollection);
    fastify.patch('/rooms/:roomId/collections/order', { preHandler }, reorderCollections);
    
    // Comments
    fastify.get('/links/:linkId/comments', { preHandler }, getComments);
    fastify.post('/links/:linkId/comments', { preHandler }, postComment);
    fastify.delete('/comments/:commentId', { preHandler }, deleteComment);
    
    // Reader mode routes
    fastify.get('/links/:linkId/reader', { preHandler }, getReaderContent);
    fastify.get('/links/:linkId/annotations', { preHandler }, getAnnotations);
    fastify.post('/links/:linkId/annotations', { preHandler }, createAnnotation);
    fastify.delete('/annotations/:annotationId', { preHandler }, deleteAnnotation);
}
