import { FastifyRequest, FastifyReply } from 'fastify';
import { ShareService } from '../services';

// Service instance
const shareService = new ShareService();

/**
 * Invite a user to a shared file.
 */
export const inviteFile = async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user as any;
    const userId = user?.id || user?._id;
    const result = await shareService.inviteToFile(userId, request.body as any, request as any);
    reply.code(201).send(result);
};

/**
 * Get the encrypted shared key for a specific file.
 */
export const getSharedFileKey = async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user as any;
    const userId = user?.id || user?._id;
    const params = request.params as any;
    const result = await shareService.getSharedFileKey(userId, params.fileId);
    reply.send(result);
};

/**
 * Create a shared link for a file or folder.
 */
export const createLink = async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user as any;
    const userId = user?.id || user?._id;
    const result = await shareService.createLink(userId, request.body as any);
    reply.code(201).send(result);
};

/**
 * Get all shared links created by the current user.
 */
export const getMyLinks = async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user as any;
    const userId = user?.id || user?._id;
    const query = request.query as Record<string, string>;
    const page = parseInt(query.page) || 1;
    const limit = parseInt(query.limit) || 5;
    const result = await shareService.getMyLinks(userId, page, limit);
    reply.send(result);
};

/**
 * Revoke/Delete a shared link.
 */
export const revokeLink = async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user as any;
    const userId = user?.id || user?._id;
    const params = request.params as any;
    await shareService.revokeLink(userId, params.id);
    reply.send({ message: 'Link revoked successfully' });
};
