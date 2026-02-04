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
} from '../controllers/noteController';

/**
 * Notes Routes - Streaming support for note content
 * Critical Priority - 18 endpoints total (14 notes + 4 folders)
 */

export default async function noteRoutes(fastify: FastifyInstance) {
    const preHandler = [fastify.authenticate, fastify.csrfProtection];
    
    // All routes require authentication and CSRF protection
    // Folder CRUD (must be before /:id routes to avoid conflicts)
    fastify.get('/folders', { preHandler }, getFolders);
    fastify.post('/folders', { preHandler }, createFolder);
    fastify.put('/folders/:id', { preHandler }, updateFolder);
    fastify.delete('/folders/:id', { preHandler }, deleteFolder);
    
    // Note CRUD
    fastify.get('/', { preHandler }, getNotes);
    fastify.get('/tags', { preHandler }, getUserTags);
    fastify.get('/backlinks/:entityId', { preHandler }, getBacklinks);
    fastify.get('/:id', { preHandler }, getNote);
    fastify.get('/:id/content', { preHandler }, getNoteContent);
    fastify.get('/:id/content/stream', { preHandler }, getNoteContentStream);
    fastify.post('/', { preHandler }, createNote);
    fastify.put('/:id/metadata', { preHandler }, updateNoteMetadata);
    fastify.put('/:id/content', { preHandler }, updateNoteContent);
    fastify.delete('/:id', { preHandler }, deleteNote);
    
    // Note Media
    fastify.post('/media/upload-init', { preHandler }, uploadMediaInit);
    fastify.put('/media/upload-chunk', { preHandler }, uploadMediaChunk);
    fastify.get('/media/download/:id', { preHandler }, downloadMedia);
    fastify.get('/media/metadata/:id', { preHandler }, getMediaMetadata);
}
