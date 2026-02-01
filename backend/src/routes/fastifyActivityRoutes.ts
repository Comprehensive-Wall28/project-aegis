import { FastifyInstance } from 'fastify';
import { getDashboardActivity } from '../controllers/fastifyActivityController';
import { authenticateUser } from '../middleware/fastifyAuthMiddleware';
import { csrfProtection } from '../middleware/fastifyCsrf';

export async function activityRoutes(app: FastifyInstance) {
    const authCsrf = [authenticateUser, csrfProtection];

    app.get('/dashboard', { preHandler: authCsrf, handler: getDashboardActivity });
}
