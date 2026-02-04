import { FastifyRequest, FastifyReply } from 'fastify';
import { PublicShareService } from '../services';
import logger from '../utils/logger';

// Service instance
const publicShareService = new PublicShareService();

/**
 * Get metadata for a shared link.
 * Access: Public
 */
export const getLinkMetadata = async (request: FastifyRequest, reply: FastifyReply) => {
    const params = request.params as any;
    const { token } = params;
    const result = await publicShareService.getLinkMetadata(token);
    reply.send(result);
};

/**
 * Download file via shared link.
 * Access: Public (if link is public)
 */
export const downloadSharedFile = async (request: FastifyRequest, reply: FastifyReply) => {
    const params = request.params as any;
    const { token } = params;
    const { stream, mimeType, fileName, fileSize } = await publicShareService.downloadSharedFile(token);

    reply.header('Content-Type', mimeType);
    reply.header('Content-Disposition', `attachment; filename="${fileName}"`);
    reply.header('Content-Length', fileSize.toString());

    stream.on('error', (err) => {
        logger.error(`Stream error: ${err}`);
        if (!reply.sent) {
            reply.code(500).send({ message: 'Download failed' });
        }
    });

    return reply.send(stream);
};
