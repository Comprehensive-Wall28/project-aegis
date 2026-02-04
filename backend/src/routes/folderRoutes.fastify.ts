import { FastifyInstance } from 'fastify';
import {
    getFolders,
    getFolder,
    createFolder,
    renameFolder,
    deleteFolder,
    moveFiles
} from '../controllers/folderController';

/**
 * Folder Routes - Simple CRUD
 * High Priority - 6 endpoints total
 */

export default async function folderRoutes(fastify: FastifyInstance) {
    const preHandler = [fastify.authenticate, fastify.csrfProtection];
    
    // All routes require authentication and CSRF protection
    // File operations (must be before /:id routes to prevent matching 'move-files' as id)
    fastify.put('/move-files', { preHandler }, moveFiles);
    
    // Folder CRUD
    fastify.get('/', { preHandler }, getFolders);
    fastify.get('/:id', { preHandler }, getFolder);
    fastify.post('/', { preHandler }, createFolder);
    fastify.put('/:id', { preHandler }, renameFolder);
    fastify.delete('/:id', { preHandler }, deleteFolder);
}
