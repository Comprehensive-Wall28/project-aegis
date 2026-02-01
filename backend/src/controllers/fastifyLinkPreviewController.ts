import { FastifyReply } from 'fastify';
import { catchAsync } from '../middleware/fastifyControllerWrapper';
import { LinkPreviewService } from '../services';
import { ServiceError } from '../services/base/BaseService';
import logger from '../utils/logger';

const linkPreviewService = new LinkPreviewService();

export const proxyImage = catchAsync(async (request: any, reply: FastifyReply) => {
    const query = request.query as any;
    const url = query.url as string;

    const { stream, contentType } = await linkPreviewService.proxyImage(url);

    reply.header('Content-Type', contentType);
    reply.header('Cache-Control', 'public, max-age=86400');

    return reply.send(stream);
});
