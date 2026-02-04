import { FastifyRequest, FastifyReply } from 'fastify';
import { AuditService } from '../services';

// Service instance
const auditService = new AuditService();

/**
 * Get audit logs for the authenticated user.
 * Supports pagination via limit and offset query parameters.
 */
export const getAuditLogs = async (request: FastifyRequest, reply: FastifyReply) => {
    const query = request.query as Record<string, string>;
    const limit = parseInt(query.limit) || 50;
    const offset = parseInt(query.offset) || 0;

    const user = request.user as any;
    const userId = user?.id || user?._id;
    const result = await auditService.getAuditLogs(userId, limit, offset);
    reply.code(200).send(result);
};

/**
 * Get a summary of recent activity for the dashboard widget.
 */
export const getRecentActivity = async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user as any;
    const userId = user?.id || user?._id;
    const result = await auditService.getRecentActivity(userId);
    reply.code(200).send(result);
};
