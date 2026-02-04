import { FastifyInstance } from 'fastify';
import {
    uploadInit,
    uploadChunk,
    getUserFiles,
    getFile,
    downloadFile,
    deleteUserFile,
    getStorageStats
} from '../controllers/vaultController';

/**
 * Vault Routes - File uploads with chunked support
 * Critical Priority - 7 endpoints total
 */

export default async function vaultRoutes(fastify: FastifyInstance) {
    const preHandler = [fastify.authenticate, fastify.csrfProtection];
    
    // Register content type parser for binary data (application/octet-stream)
    // This is needed for chunked file uploads
    if (!fastify.hasContentTypeParser('application/octet-stream')) {
        fastify.addContentTypeParser(
            'application/octet-stream',
            { parseAs: 'string' as const },
            async (request: any, payload: any) => {
                // Return the raw payload stream
                return payload;
            }
        );
    }
    
    // All vault routes require authentication and CSRF protection
    fastify.post('/upload-init', { preHandler }, uploadInit);
    
    // Upload chunk endpoint - accepts raw binary data stream
    fastify.put('/upload-chunk', { 
        preHandler,
        bodyLimit: 10 * 1024 * 1024 // 10MB chunks
    }, uploadChunk);
    
    fastify.get('/files', { preHandler }, getUserFiles);
    fastify.get('/files/:id', { preHandler }, getFile);
    fastify.get('/download/:id', { preHandler }, downloadFile);
    fastify.delete('/files/:id', { preHandler }, deleteUserFile);
    fastify.get('/storage-stats', { preHandler }, getStorageStats);
}
