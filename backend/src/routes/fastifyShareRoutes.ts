import { FastifyInstance } from 'fastify';
import {
    inviteFile,
    getSharedFileKey,
    createLink,
    getMyLinks,
    revokeLink
} from '../controllers/fastifyShareController';
import { authenticateUser } from '../middleware/fastifyAuthMiddleware';
import { csrfProtection } from '../middleware/fastifyCsrf';

export async function shareRoutes(app: FastifyInstance) {
    const authCsrf = [authenticateUser, csrfProtection];

    app.post('/invite', { preHandler: authCsrf, handler: inviteFile });
    app.get('/files/:fileId/key', { preHandler: authCsrf, handler: getSharedFileKey });
    app.post('/link', { preHandler: authCsrf, handler: createLink });
    app.get('/my-links', { preHandler: authCsrf, handler: getMyLinks });
    app.delete('/link/:id', { preHandler: authCsrf, handler: revokeLink });
}
