import { FastifyReply } from 'fastify';
import { AuthRequest, FastifyHandler, AuthHandler } from '../types/fastify';
import logger from '../utils/logger';

/**
 * Wraps async controller with try-catch error handling
 * Replaces Express catchAsync wrapper
 */
export const catchAsync = (fn: FastifyHandler): FastifyHandler => {
    return async (request: any, reply: FastifyReply) => {
        try {
            await fn(request, reply);
        } catch (error: any) {
            logger.error('Controller error:', {
                method: request.method,
                url: request.url,
                error: error.message,
                stack: error.stack,
            });

            const statusCode = error.statusCode || error.status || 500;
            reply.status(statusCode).send({
                message: error.message || 'Server error',
                code: error.code,
            });
        }
    };
};

/**
 * Wraps authenticated controller with auth check and error handling
 * Replaces Express withAuth wrapper
 */
export const withAuth = (fn: AuthHandler): AuthHandler => {
    return async (request: AuthRequest, reply: FastifyReply) => {
        // Verify user is authenticated
        if (!request.user) {
            return reply.status(401).send({
                message: 'Not authenticated',
                code: 'UNAUTHORIZED',
            });
        }

        try {
            await fn(request, reply);
        } catch (error: any) {
            logger.error('Auth controller error:', {
                method: request.method,
                url: request.url,
                userId: request.user?.id,
                error: error.message,
                stack: error.stack,
            });

            const statusCode = error.statusCode || error.status || 500;
            reply.status(statusCode).send({
                message: error.message || 'Server error',
                code: error.code,
            });
        }
    };
};

/**
 * Optional: Wrapper for controllers that need validation
 * Can be extended with schema validation in the future
 */
export const withValidation = (fn: FastifyHandler): FastifyHandler => {
    return async (request: any, reply: FastifyReply) => {
        // Future: Add schema validation here
        // For now, just pass through
        await fn(request, reply);
    };
};
