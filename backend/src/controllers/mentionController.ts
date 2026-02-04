import { FastifyRequest, FastifyReply } from 'fastify';
import { MentionService } from '../services/MentionService';

const mentionService = new MentionService();

/**
 * Get all backlinks for a specific entity.
 */
export const getBacklinks = async (request: FastifyRequest, reply: FastifyReply) => {
    const query = request.query as Record<string, string>;
    const { targetId } = query;
    if (!targetId || typeof targetId !== 'string') {
        return reply.code(400).send({ message: 'Missing targetId query parameter' });
    }

    const user = request.user as any;
    const userId = user?.id || user?._id;
    const backlinks = await mentionService.getBacklinks(userId, targetId);
    reply.code(200).send(backlinks);
};
