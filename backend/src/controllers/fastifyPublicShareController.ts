import { FastifyReply } from 'fastify';
import { catchAsync } from '../middleware/fastifyControllerWrapper';
import { PublicShareService } from '../services';
import logger from '../utils/logger';

const publicShareService = new PublicShareService();

export const getLinkMetadata = catchAsync(async (request: any, reply: FastifyReply) => {
    const { token } = request.params as { token: string };
    const result = await publicShareService.getLinkMetadata(token);
    reply.send(result);
});

export const downloadSharedFile = catchAsync(async (request: any, reply: FastifyReply) => {
    const { token } = request.params as { token: string };
    const { stream, mimeType, fileName, fileSize } = await publicShareService.downloadSharedFile(token);

    reply.header('Content-Type', mimeType);
    reply.header('Content-Disposition', `attachment; filename="${fileName}"`);
    reply.header('Content-Length', fileSize.toString());

    stream.on('error', (err) => {
        logger.error(`Stream error: ${err}`);
        if (!reply.sent) {
            reply.status(500).send({ message: 'Download failed' });
        }
    });

    return reply.send(stream);
});
