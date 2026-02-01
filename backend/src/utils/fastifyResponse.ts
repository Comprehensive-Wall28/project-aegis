import { FastifyReply } from 'fastify';

/**
 * Helper functions for consistent API responses
 */

export const sendSuccess = (
    reply: FastifyReply,
    data: any,
    statusCode: number = 200
) => {
    return reply.status(statusCode).send(data);
};

export const sendCreated = (reply: FastifyReply, data: any) => {
    return reply.status(201).send(data);
};

export const sendNoContent = (reply: FastifyReply) => {
    return reply.status(204).send();
};

export const sendError = (
    reply: FastifyReply,
    message: string,
    statusCode: number = 500,
    code?: string
) => {
    return reply.status(statusCode).send({
        message,
        code,
    });
};

export const sendBadRequest = (reply: FastifyReply, message: string) => {
    return sendError(reply, message, 400, 'BAD_REQUEST');
};

export const sendUnauthorized = (reply: FastifyReply, message: string = 'Unauthorized') => {
    return sendError(reply, message, 401, 'UNAUTHORIZED');
};

export const sendForbidden = (reply: FastifyReply, message: string = 'Forbidden') => {
    return sendError(reply, message, 403, 'FORBIDDEN');
};

export const sendNotFound = (reply: FastifyReply, message: string = 'Not found') => {
    return sendError(reply, message, 404, 'NOT_FOUND');
};

/**
 * Send paginated response
 */
export const sendPaginated = (
    reply: FastifyReply,
    data: any[],
    pagination: {
        total?: number;
        page?: number;
        limit?: number;
        cursor?: string;
        hasMore?: boolean;
    }
) => {
    return reply.status(200).send({
        data,
        pagination,
    });
};
