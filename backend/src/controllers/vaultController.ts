import { FastifyRequest, FastifyReply } from 'fastify';
import { VaultService, ServiceError } from '../services';
import logger from '../utils/logger';

// Service instance
const vaultService = new VaultService();

/**
 * Initialize a file upload session
 */
export const uploadInit = async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user as any;
    const userId = user?.id || user?._id;
    const result = await vaultService.initUpload(userId, request.body as any, request as any);
    reply.code(200).send({ fileId: result.fileId });
};

/**
 * Upload a file chunk
 */
export const uploadChunk = async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user as any;
    const userId = user?.id || user?._id;
    const query = request.query as Record<string, string>;
    const fileId = query.fileId;
    const contentRange = request.headers['content-range'] as string;
    const contentLength = parseInt(request.headers['content-length'] || '0', 10);

    if (contentLength === 0) {
        throw new ServiceError('Missing Content-Length', 400);
    }

    // With Fastify's content type parser, request.body is the stream
    // Fall back to request.raw if body is not set (shouldn't happen with proper parser)
    const stream = (request.body as any) || request.raw;
    
    const result = await vaultService.uploadChunk(
        userId,
        fileId,
        contentRange,
        stream,
        contentLength
    );

    if (result.complete) {
        reply.code(200).send({
            message: 'Upload successful',
            googleDriveFileId: result.googleDriveFileId
        });
    } else {
        // Send 308 Resume Incomplete (following Google Drive convention)
        reply.code(308).header('Range', `bytes=0-${result.receivedSize! - 1}`).send();
    }
};

/**
 * Download a file
 */
export const downloadFile = async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user as any;
    const userId = user?.id || user?._id;
    const params = request.params as any;
    const { stream, file } = await vaultService.getDownloadStream(
        userId,
        params.id
    );

    // Handle stream errors
    stream.on('error', (err) => {
        logger.error(`Google Drive stream error: ${err}`);
        if (!reply.sent) {
            reply.code(500).send({ message: 'Download failed' });
        }
    });

    reply.header('Content-Type', file.mimeType || 'application/octet-stream');
    reply.header('Content-Disposition', `attachment; filename="${file.originalFileName}"`);
    reply.header('Content-Length', file.fileSize.toString());

    // Return the reply to ensure Fastify properly handles the stream
    return reply.send(stream);
};

/**
 * Get a single file
 */
export const getFile = async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user as any;
    const userId = user?.id || user?._id;
    const params = request.params as any;
    const file = await vaultService.getFile(userId, params.id);
    reply.send(file);
};

/**
 * Get user files (optionally filtered by folder, supports pagination)
 */
export const getUserFiles = async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user as any;
    const userId = user?.id || user?._id;
    const query = request.query as Record<string, string>;
    const folderId = query.folderId as string | undefined;
    const normalizedFolderId = folderId && folderId !== 'null' ? folderId : null;

    // Check for pagination params
    const limit = query.limit ? parseInt(query.limit) : undefined;
    const cursor = query.cursor as string | undefined;
    const search = query.search as string | undefined;

    if (limit !== undefined) {
        const result = await vaultService.getUserFilesPaginated(
            userId,
            normalizedFolderId,
            { limit, cursor, search }
        );
        return reply.send(result);
    }

    // Non-paginated fallback
    const files = await vaultService.getUserFiles(userId, folderId, search);
    reply.send(files);
};

/**
 * Delete a file
 */
export const deleteUserFile = async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user as any;
    const userId = user?.id || user?._id;
    const params = request.params as any;
    await vaultService.deleteFile(userId, params.id, request as any);
    reply.code(200).send({ message: 'File deleted successfully' });
};

/**
 * Get user storage stats
 */
export const getStorageStats = async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user as any;
    const userId = user?.id || user?._id;
    const stats = await vaultService.getStorageStats(userId);
    reply.send(stats);
};
