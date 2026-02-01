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
} from '../controllers/fastifySocialController';
import { proxyImage } from '../controllers/fastifyLinkPreviewController';
import { authenticateUser } from '../middleware/fastifyAuthMiddleware';
import { csrfProtection } from '../middleware/fastifyCsrf';

export async function socialRoutes(app: FastifyInstance) {
    const authCsrf = [authenticateUser, csrfProtection];

    // Public endpoints - no auth required
    app.get('/invite/:inviteCode', getInviteInfo);
    app.get('/proxy-image', proxyImage);

    // Protected routes - require auth and CSRF
    app.get('/rooms', { preHandler: authCsrf, handler: getUserRooms });
    app.post('/rooms', { preHandler: authCsrf, handler: createRoom });
    app.post('/rooms/:roomId/invite', { preHandler: authCsrf, handler: createInvite });
    app.post('/rooms/join', { preHandler: authCsrf, handler: joinRoom });
    app.post('/rooms/:roomId/leave', { preHandler: authCsrf, handler: leaveRoom });
    app.delete('/rooms/:roomId', { preHandler: authCsrf, handler: deleteRoom });
    app.post('/rooms/:roomId/links', { preHandler: authCsrf, handler: postLink });
    app.post('/rooms/:roomId/collections', { preHandler: authCsrf, handler: createCollection });
    app.get('/rooms/:roomId', { preHandler: authCsrf, handler: getRoomContent });
    app.get('/rooms/:roomId/collections/:collectionId/links', { preHandler: authCsrf, handler: getCollectionLinks });
    app.get('/rooms/:roomId/search', { preHandler: authCsrf, handler: searchRoomLinks });
    app.delete('/links/:linkId', { preHandler: authCsrf, handler: deleteLink });
    app.delete('/collections/:collectionId', { preHandler: authCsrf, handler: deleteCollection });
    app.patch('/collections/:collectionId', { preHandler: authCsrf, handler: updateCollection });
    app.patch('/rooms/:roomId/collections/order', { preHandler: authCsrf, handler: reorderCollections });
    app.patch('/links/:linkId', { preHandler: authCsrf, handler: moveLink });
    app.post('/links/:linkId/view', { preHandler: authCsrf, handler: markLinkViewed });
    app.delete('/links/:linkId/view', { preHandler: authCsrf, handler: unmarkLinkViewed });
    app.get('/links/:linkId/comments', { preHandler: authCsrf, handler: getComments });
    app.post('/links/:linkId/comments', { preHandler: authCsrf, handler: postComment });
    app.delete('/comments/:commentId', { preHandler: authCsrf, handler: deleteComment });

    // Reader mode routes
    app.get('/links/:linkId/reader', { preHandler: authCsrf, handler: getReaderContent });
    app.get('/links/:linkId/annotations', { preHandler: authCsrf, handler: getAnnotations });
    app.post('/links/:linkId/annotations', { preHandler: authCsrf, handler: createAnnotation });
    app.delete('/annotations/:annotationId', { preHandler: authCsrf, handler: deleteAnnotation });
}
