import { FastifyInstance } from 'fastify';
import { getBacklinks } from '../controllers/fastifyMentionController';
import { authenticateUser } from '../middleware/fastifyAuthMiddleware';
import { csrfProtection } from '../middleware/fastifyCsrf';

export async function mentionRoutes(app: FastifyInstance) {
    const authCsrf = [authenticateUser, csrfProtection];

    app.get('/', { preHandler: authCsrf, handler: getBacklinks });
}
