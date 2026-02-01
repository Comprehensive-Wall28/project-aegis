import { FastifyReply } from 'fastify';
import { AuthRequest } from '../types/fastify';
import { withAuth } from '../middleware/fastifyControllerWrapper';
import { AuditService } from '../services';

const auditService = new AuditService();

export const getAuditLogs = withAuth(async (request: AuthRequest, reply: FastifyReply) => {
    const query = request.query as any;
    const limit = parseInt(query.limit as string) || 50;
    const offset = parseInt(query.offset as string) || 0;

    const result = await auditService.getAuditLogs(request.user!.id, limit, offset);
    reply.status(200).send(result);
});

export const getRecentActivity = withAuth(async (request: AuthRequest, reply: FastifyReply) => {
    const result = await auditService.getRecentActivity(request.user!.id);
    reply.status(200).send(result);
});
