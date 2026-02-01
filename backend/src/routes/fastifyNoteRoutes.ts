import { FastifyInstance } from 'fastify';
import {
    getNotes,
    getNote,
    getNoteContent,
    getNoteContentStream,
    createNote,
    updateNoteMetadata,
    updateNoteContent,
    deleteNote,
    getUserTags,
    getBacklinks,
    getFolders,
    createFolder,
    updateFolder,
    deleteFolder,
    uploadMediaInit,
    uploadMediaChunk,
    downloadMedia,
    getMediaMetadata
} from '../controllers/fastifyNoteController';
import { authenticateUser } from '../middleware/fastifyAuthMiddleware';
import { csrfProtection } from '../middleware/fastifyCsrf';

export async function noteRoutes(app: FastifyInstance) {
    // All routes require authentication and CSRF protection
    const authCsrf = [authenticateUser, csrfProtection];

    // Folder CRUD (must be before /:id routes to avoid conflicts)
    app.get('/folders', { preHandler: authCsrf, handler: getFolders });
    app.post('/folders', { preHandler: authCsrf, handler: createFolder });
    app.put('/folders/:id', { preHandler: authCsrf, handler: updateFolder });
    app.delete('/folders/:id', { preHandler: authCsrf, handler: deleteFolder });

    // Note CRUD
    app.get('/', { preHandler: authCsrf, handler: getNotes });
    app.get('/tags', { preHandler: authCsrf, handler: getUserTags });
    app.get('/backlinks/:entityId', { preHandler: authCsrf, handler: getBacklinks });
    app.get('/:id', { preHandler: authCsrf, handler: getNote });
    app.get('/:id/content', { preHandler: authCsrf, handler: getNoteContent });
    app.get('/:id/content/stream', { preHandler: authCsrf, handler: getNoteContentStream });
    app.post('/', { preHandler: authCsrf, handler: createNote });
    app.put('/:id/metadata', { preHandler: authCsrf, handler: updateNoteMetadata });
    app.put('/:id/content', { preHandler: authCsrf, handler: updateNoteContent });
    app.delete('/:id', { preHandler: authCsrf, handler: deleteNote });

    // Note Media
    app.post('/media/upload-init', { preHandler: authCsrf, handler: uploadMediaInit });
    app.put('/media/upload-chunk', { preHandler: authCsrf, handler: uploadMediaChunk });
    app.get('/media/download/:id', { preHandler: authCsrf, handler: downloadMedia });
    app.get('/media/metadata/:id', { preHandler: authCsrf, handler: getMediaMetadata });
}
