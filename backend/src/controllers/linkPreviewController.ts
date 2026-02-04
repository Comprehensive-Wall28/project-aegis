import { FastifyRequest, FastifyReply } from 'fastify';
import { LinkPreviewService } from '../services';
import { ServiceError } from '../services/base/BaseService';
import logger from '../utils/logger';

const linkPreviewService = new LinkPreviewService();

/**
 * Proxy an image to bypass CORS and mask user IP.
 */
export const proxyImage = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
        const query = request.query as Record<string, string>;
        const url = query.url as string;

        if (!url) {
            return reply.code(400).send({ message: 'URL parameter is required' });
        }

        const { stream, contentType } = await linkPreviewService.proxyImage(url);

        reply.header('Content-Type', contentType);
        // Cache for 24 hours
        reply.header('Cache-Control', 'public, max-age=86400');
        
        // Fastify handles streams natively with reply.send()
        // But we need to return the reply to properly handle the stream
        return reply.send(stream);
    } catch (error) {
        if (error instanceof ServiceError) {
            return reply.code(error.statusCode).send({ message: error.message });
        }
        logger.error(`Controller error:`, error);
        return reply.code(500).send({ message: 'Failed to fetch image' });
    }
};
