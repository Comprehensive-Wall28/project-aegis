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
            const statusCode = error.statusCode || error.status || 500;
            
            // Only log server errors (5xx) with full stack traces
            // Client errors (4xx) are expected and don't need error-level logging
            if (statusCode >= 500) {
                logger.error('Server error:', {
                    method: request.method,
                    url: request.url,
                    error: error.message,
                    stack: error.stack,
                });
            } else if (statusCode >= 400) {
                // Log client errors at debug level (won't show in production)
                logger.debug('Client error:', {
                    method: request.method,
                    url: request.url,
                    statusCode,
                    error: error.message,
                });
            }

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
            const statusCode = error.statusCode || error.status || 500;
            
            // Only log server errors (5xx) with full stack traces
            // Client errors (4xx) are expected and don't need error-level logging
            if (statusCode >= 500) {
                logger.error('Auth server error:', {
                    method: request.method,
                    url: request.url,
                    userId: request.user?.id,
                    error: error.message,
                    stack: error.stack,
                });
            } else if (statusCode >= 400) {
                // Log client errors at debug level (won't show in production)
                logger.debug('Auth client error:', {
                    method: request.method,
                    url: request.url,
                    userId: request.user?.id,
                    statusCode,
                    error: error.message,
                });
            }

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
