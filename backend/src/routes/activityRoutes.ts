import { FastifyInstance } from 'fastify';
import { getDashboardActivity } from '../controllers/activityController';

export default async function activityRoutes(fastify: FastifyInstance) {
    fastify.get('/dashboard', {
        preHandler: [fastify.authenticate]
    }, getDashboardActivity);
}
