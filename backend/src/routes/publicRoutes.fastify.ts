import { FastifyInstance } from 'fastify';
import { getLinkMetadata, downloadSharedFile } from '../controllers/publicShareController';

/**
 * Public Routes - Public file sharing access
 * Medium Priority - 2 endpoints total
 * Note: No authentication required - these are public endpoints
 */

export default async function publicRoutes(fastify: FastifyInstance) {
    // Public endpoints - no authentication required
    fastify.get('/share/:token', {}, getLinkMetadata);
    fastify.get('/share/:token/download', {}, downloadSharedFile);
}
