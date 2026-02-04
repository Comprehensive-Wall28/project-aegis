import { FastifyInstance } from 'fastify';
import { getBacklinks } from '../controllers/mentionController';

export default async function mentionRoutes(fastify: FastifyInstance) {
    /**
     * @route   GET /api/mentions/backlinks
     * @desc    Get all entities that mention a specific target ID
     * @access  Private
     */
    fastify.get('/backlinks', {
        preHandler: [fastify.authenticate]
    }, getBacklinks);
}
