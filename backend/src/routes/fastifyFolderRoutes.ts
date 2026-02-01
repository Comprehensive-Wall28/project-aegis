import { FastifyInstance } from 'fastify';
import {
    getFolders,
    getFolder,
    createFolder,
    renameFolder,
    deleteFolder,
    moveFiles
} from '../controllers/fastifyFolderController';
import { authenticateUser } from '../middleware/fastifyAuthMiddleware';
import { csrfProtection } from '../middleware/fastifyCsrf';

export async function folderRoutes(app: FastifyInstance) {
    const authCsrf = [authenticateUser, csrfProtection];

    app.get('/', { preHandler: authCsrf, handler: getFolders });
    app.get('/:id', { preHandler: authCsrf, handler: getFolder });
    app.post('/', { preHandler: authCsrf, handler: createFolder });
    app.put('/:id', { preHandler: authCsrf, handler: renameFolder });
    app.delete('/:id', { preHandler: authCsrf, handler: deleteFolder });
    app.post('/move', { preHandler: authCsrf, handler: moveFiles });
}
