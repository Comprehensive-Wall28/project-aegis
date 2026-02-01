import { FastifyReply } from 'fastify';
import { AuthRequest } from '../types/fastify';
import { withAuth } from '../middleware/fastifyControllerWrapper';
import { MentionService } from '../services/MentionService';

const mentionService = new MentionService();

export const getBacklinks = withAuth(async (request: AuthRequest, reply: FastifyReply) => {
    const query = request.query as any;
    const { targetId } = query;
    if (!targetId || typeof targetId !== 'string') {
        return reply.status(400).send({ message: 'Missing targetId query parameter' });
    }

    const backlinks = await mentionService.getBacklinks(request.user!.id, targetId);
    reply.status(200).send(backlinks);
});
