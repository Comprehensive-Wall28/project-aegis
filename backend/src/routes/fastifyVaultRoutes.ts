import { FastifyInstance } from 'fastify';
import {
    uploadInit,
    getUserFiles,
    getFile,
    downloadFile,
    uploadChunk,
    deleteUserFile,
    getStorageStats
} from '../controllers/fastifyVaultController';
import { authenticateUser } from '../middleware/fastifyAuthMiddleware';
import { csrfProtection } from '../middleware/fastifyCsrf';

export async function vaultRoutes(app: FastifyInstance) {
    const authCsrf = [authenticateUser, csrfProtection];

    app.post('/upload-init', { preHandler: authCsrf, handler: uploadInit });
    app.put('/upload-chunk', { preHandler: authCsrf, handler: uploadChunk });
    app.get('/files', { preHandler: authCsrf, handler: getUserFiles });
    app.get('/files/:id', { preHandler: authCsrf, handler: getFile });
    app.get('/download/:id', { preHandler: authCsrf, handler: downloadFile });
    app.delete('/files/:id', { preHandler: authCsrf, handler: deleteUserFile });
    app.get('/storage-stats', { preHandler: authCsrf, handler: getStorageStats });
}
