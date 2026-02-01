import { FastifyInstance } from 'fastify';
import {
    getAuditLogs,
    getRecentActivity
} from '../controllers/fastifyAuditController';
import { authenticateUser } from '../middleware/fastifyAuthMiddleware';
import { csrfProtection } from '../middleware/fastifyCsrf';

export async function auditRoutes(app: FastifyInstance) {
    const authCsrf = [authenticateUser, csrfProtection];

    app.get('/', { preHandler: authCsrf, handler: getAuditLogs });
    app.get('/recent', { preHandler: authCsrf, handler: getRecentActivity });
}
