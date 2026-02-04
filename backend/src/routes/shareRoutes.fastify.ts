import { FastifyInstance } from 'fastify';
import { inviteFile, createLink, getMyLinks, revokeLink, getSharedFileKey } from '../controllers/shareController';

/**
 * Share Routes - File sharing functionality
 * Medium Priority - 5 endpoints total
 * Note: No CSRF protection on these routes
 */

export default async function shareRoutes(fastify: FastifyInstance) {
    // All share routes are protected but without CSRF
    const preHandler = [fastify.authenticate];
    
    fastify.post('/invite-file', { preHandler }, inviteFile);
    fastify.post('/link', { preHandler }, createLink);
    fastify.get('/my-links', { preHandler }, getMyLinks);
    fastify.delete('/link/:id', { preHandler }, revokeLink);
    fastify.get('/shared-file/:fileId', { preHandler }, getSharedFileKey);
}
