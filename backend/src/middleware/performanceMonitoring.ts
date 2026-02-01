import { FastifyRequest, FastifyReply, HookHandlerDoneFunction } from 'fastify';
import logger from '../utils/logger';

// Threshold for slow request warnings (ms)
const SLOW_REQUEST_THRESHOLD = 1000;

/**
 * Track request start time and initial memory
 */
export async function onRequestHook(
    request: FastifyRequest,
    reply: FastifyReply
) {
    request.startTime = Date.now();
    request.startMemory = process.memoryUsage().heapUsed;
}

/**
 * Log request completion with comprehensive performance metrics
 * All requests logged at info level with full performance data
 * Slow requests (>1000ms) additionally logged at warn level
 */
export async function onResponseHook(
    request: FastifyRequest,
    reply: FastifyReply
) {
    const now = Date.now();
    const duration = now - (request.startTime || now);
    const memoryUsage = process.memoryUsage().heapUsed;
    
    // Calculate request/response sizes
    const requestSize = getRequestSize(request);
    const responseSize = getResponseSize(reply);

    // Base performance data for all requests
    const performanceData = {
        method: request.method,
        url: request.url,
        statusCode: reply.statusCode,
        duration,
        requestSize,
        responseSize,
        memoryUsage,
        userId: (request as any).user?.id,
    };

    // Log ALL requests at info level for performance tracking
    logger.info('Request completed', performanceData);

    // Additionally warn on slow requests
    if (duration > SLOW_REQUEST_THRESHOLD) {
        logger.warn('Slow request detected', {
            ...performanceData,
            threshold: SLOW_REQUEST_THRESHOLD,
        });
    }

    // Log errors with additional context
    if (reply.statusCode >= 500) {
        logger.error('Server error response', {
            ...performanceData,
            error: 'Server error',
        });
    }
}

/**
 * Calculate approximate request body size
 */
function getRequestSize(request: FastifyRequest): number {
    // Try content-length header first
    const contentLength = request.headers['content-length'];
    if (contentLength) {
        return parseInt(contentLength, 10) || 0;
    }
    
    // Estimate from body if available
    if (request.body) {
        try {
            return JSON.stringify(request.body).length;
        } catch {
            return 0;
        }
    }
    
    return 0;
}

/**
 * Calculate approximate response size
 */
function getResponseSize(reply: FastifyReply): number {
    // Try content-length header
    const contentLength = reply.getHeader('content-length');
    if (contentLength) {
        if (typeof contentLength === 'string') {
            return parseInt(contentLength, 10) || 0;
        }
        if (typeof contentLength === 'number') {
            return contentLength;
        }
    }
    
    return 0;
}

/**
 * Register performance monitoring hooks
 * Now enabled in all environments for comprehensive monitoring
 */
export function registerPerformanceHooks(app: any) {
    app.addHook('onRequest', onRequestHook);
    app.addHook('onResponse', onResponseHook);
}
