import { FastifyReply } from 'fastify';
import { AuthRequest } from '../types/fastify';
import { withAuth } from '../middleware/fastifyControllerWrapper';
import { ShareService } from '../services';

const shareService = new ShareService();

export const inviteFile = withAuth(async (request: AuthRequest, reply: FastifyReply) => {
    const result = await shareService.inviteToFile(request.user!.id, request.body as any, request);
    reply.status(201).send(result);
});

export const getSharedFileKey = withAuth(async (request: AuthRequest, reply: FastifyReply) => {
    const { fileId } = request.params as { fileId: string };
    const result = await shareService.getSharedFileKey(request.user!.id, fileId);
    reply.send(result);
});

export const createLink = withAuth(async (request: AuthRequest, reply: FastifyReply) => {
    const result = await shareService.createLink(request.user!.id, request.body as any);
    reply.status(201).send(result);
});

export const getMyLinks = withAuth(async (request: AuthRequest, reply: FastifyReply) => {
    const query = request.query as any;
    const page = parseInt(query.page as string) || 1;
    const limit = parseInt(query.limit as string) || 5;
    const result = await shareService.getMyLinks(request.user!.id, page, limit);
    reply.send(result);
});

export const revokeLink = withAuth(async (request: AuthRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    await shareService.revokeLink(request.user!.id, id);
    reply.send({ message: 'Link revoked successfully' });
});
