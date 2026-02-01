import { FastifyRequest, FastifyReply, HookHandlerDoneFunction } from 'fastify';
import logger from '../utils/logger';

/**
 * Track request start time
 */
export async function onRequestHook(
    request: FastifyRequest,
    reply: FastifyReply
) {
    request.startTime = Date.now();
}

/**
 * Log request completion with duration
 */
export async function onResponseHook(
    request: FastifyRequest,
    reply: FastifyReply
) {
    const duration = Date.now() - (request.startTime || Date.now());

    // Log slow requests
    if (duration > 1000) {
        logger.warn('Slow request detected:', {
            method: request.method,
            url: request.url,
            statusCode: reply.statusCode,
            duration,
            userId: (request as any).user?.id,
        });
    }

    // Log all requests in development
    if (process.env.NODE_ENV !== 'production') {
        logger.debug('Request completed:', {
            method: request.method,
            url: request.url,
            statusCode: reply.statusCode,
            duration,
        });
    }
}

/**
 * Register performance monitoring hooks
 */
export function registerPerformanceHooks(app: any) {
    app.addHook('onRequest', onRequestHook);
    app.addHook('onResponse', onResponseHook);
}
