import { FastifyError, FastifyRequest, FastifyReply } from 'fastify';
import { config } from '../config/env';
import logger from '../utils/logger';

/**
 * Global error handler for Fastify
 * Replaces Express errorHandler middleware
 */
export function fastifyErrorHandler(
    error: FastifyError,
    request: FastifyRequest,
    reply: FastifyReply
) {
    // Determine status code
    let statusCode = error.statusCode || 500;

    // Handle specific error codes
    if (error.code === 'EBADCSRFTOKEN') {
        statusCode = 403;
    }

    // Log error with context
    logger.error('Request error:', {
        method: request.method,
        url: request.url,
        statusCode,
        errorCode: error.code,
        message: error.message,
        stack: config.nodeEnv === 'production' ? undefined : error.stack,
        userId: (request as any).user?.id,
    });

    // Send error response
    reply.status(statusCode).send({
        message: error.message,
        code: error.code,
        stack: config.nodeEnv === 'production' ? undefined : error.stack,
    });
}

/**
 * Register error handler with Fastify app
 */
export function registerErrorHandler(app: any) {
    app.setErrorHandler(fastifyErrorHandler);
}
