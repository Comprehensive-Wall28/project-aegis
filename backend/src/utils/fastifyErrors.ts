import { FastifyReply } from 'fastify';
import logger from './logger';

export class ServiceError extends Error {
    statusCode: number;
    code?: string;

    constructor(message: string, statusCode: number = 500, code?: string) {
        super(message);
        this.statusCode = statusCode;
        this.code = code;
        this.name = 'ServiceError';
    }
}

/**
 * Handle errors in Fastify controllers
 * Compatible with ServiceError class
 */
export const handleFastifyError = (error: any, reply: FastifyReply) => {
    if (error instanceof ServiceError) {
        return reply.status(error.statusCode).send({
            message: error.message,
            code: error.code,
        });
    }

    logger.error('Unexpected error:', {
        error: error.message,
        stack: error.stack,
    });

    return reply.status(500).send({
        message: 'Server error',
        code: 'INTERNAL_ERROR',
    });
};

// Keep original for backward compatibility during migration
export { handleError } from './errors';
