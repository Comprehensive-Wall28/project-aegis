import { FastifyReply } from 'fastify';
import { AuthRequest } from '../types/fastify';
import { withAuth } from '../middleware/fastifyControllerWrapper';
import { VaultService, ServiceError } from '../services';
import logger from '../utils/logger';

const vaultService = new VaultService();

export const uploadInit = withAuth(async (request: AuthRequest, reply: FastifyReply) => {
    const result = await vaultService.initUpload(request.user!.id, request.body as any, request);
    reply.status(200).send({ fileId: result.fileId });
});

export const uploadChunk = withAuth(async (request: AuthRequest, reply: FastifyReply) => {
    const query = request.query as any;
    const fileId = query.fileId as string;
    const contentRange = request.headers['content-range'] as string;
    const contentLength = parseInt(request.headers['content-length'] || '0', 10);

    if (contentLength === 0) {
        throw new ServiceError('Missing Content-Length', 400);
    }

    const result = await vaultService.uploadChunk(
        request.user!.id,
        fileId,
        contentRange,
        request.raw,
        contentLength
    );

    if (result.complete) {
        reply.status(200).send({
            message: 'Upload successful',
            googleDriveFileId: result.googleDriveFileId
        });
    } else {
        reply.status(308).header('Range', `bytes=0-${result.receivedSize! - 1}`).send();
    }
});

export const downloadFile = withAuth(async (request: AuthRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const { stream, file } = await vaultService.getDownloadStream(request.user!.id, id);

    stream.on('error', (err) => {
        logger.error(`Google Drive stream error: ${err}`);
        if (!reply.sent) {
            reply.status(500).send({ message: 'Download failed' });
        }
    });

    reply.header('Content-Type', file.mimeType || 'application/octet-stream');
    reply.header('Content-Disposition', `attachment; filename="${file.originalFileName}"`);
    reply.header('Content-Length', file.fileSize.toString());

    return reply.send(stream);
});

export const getFile = withAuth(async (request: AuthRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const file = await vaultService.getFile(request.user!.id, id);
    reply.send(file);
});

export const getUserFiles = withAuth(async (request: AuthRequest, reply: FastifyReply) => {
    const query = request.query as any;
    const folderId = query.folderId as string | undefined;
    const normalizedFolderId = folderId && folderId !== 'null' ? folderId : null;

    // Check for pagination params
    const limit = query.limit ? parseInt(query.limit as string) : undefined;
    const cursor = query.cursor as string | undefined;
    const search = query.search as string | undefined;

    if (limit !== undefined) {
        const result = await vaultService.getUserFilesPaginated(
            request.user!.id,
            normalizedFolderId,
            { limit, cursor, search }
        );
        return reply.send(result);
    }

    // Non-paginated fallback
    const files = await vaultService.getUserFiles(request.user!.id, folderId, search);
    reply.send(files);
});

export const deleteUserFile = withAuth(async (request: AuthRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    await vaultService.deleteFile(request.user!.id, id, request);
    reply.send({ message: 'File deleted successfully' });
});

export const getStorageStats = withAuth(async (request: AuthRequest, reply: FastifyReply) => {
    const stats = await vaultService.getStorageStats(request.user!.id);
    reply.send(stats);
});
