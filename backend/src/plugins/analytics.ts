import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { analyticsBuffer } from '../utils/analyticsBuffer';

/**
 * Analytics Plugin - captures performance metrics for all requests
 * MITIGATION: Uses Fastify hooks (onRequest + onResponse) instead of Express res.on('finish')
 * Zero performance impact - uses fire-and-forget pattern
 * Captures: method, path, status, duration, userId, IP, userAgent
 */
export async function analyticsPlugin(fastify: FastifyInstance) {
    // Hook to capture start time
    fastify.addHook('onRequest', async (request: FastifyRequest, reply: FastifyReply) => {
        request._analyticsStartTime = process.hrtime.bigint();
    });

    // Hook to capture metrics after response is sent
    fastify.addHook('onResponse', async (request: FastifyRequest, reply: FastifyReply) => {
        const endTime = process.hrtime.bigint();
        const startTime = request._analyticsStartTime;
        
        if (!startTime) return;
        
        const durationMs = Number(endTime - startTime) / 1000000; // Convert nanoseconds to milliseconds

        // Extract user ID if authenticated
        const user = request.user as any;
        const userId = user?._id?.toString() || user?.id;

        // Build metadata
        const metadata: Record<string, any> = {};
        
        // Capture query params (excluding sensitive data)
        if (request.query && typeof request.query === 'object' && Object.keys(request.query).length > 0) {
            const safeQuery = { ...request.query as Record<string, any> };
            // Remove potentially sensitive fields
            delete safeQuery.password;
            delete safeQuery.token;
            delete safeQuery.secret;
            delete safeQuery.key;
            if (Object.keys(safeQuery).length > 0) {
                metadata.query = safeQuery;
            }
        }

        // Capture response size if available
        const contentLength = reply.getHeader('Content-Length');
        if (contentLength) {
            metadata.contentLength = typeof contentLength === 'string' ? parseInt(contentLength, 10) : contentLength;
        }

        // Capture error message for failed requests
        if (reply.statusCode >= 400 && request._errorMessage) {
            metadata.errorMessage = request._errorMessage;
        }

        // Queue metric (fire and forget - never await)
        analyticsBuffer.queueMetric({
            method: request.method,
            path: request.routeOptions?.url || request.url,
            statusCode: reply.statusCode,
            durationMs,
            userId,
            ipAddress: request.ip || request.socket.remoteAddress || 'unknown',
            userAgent: request.headers['user-agent'] || undefined,
            timestamp: new Date(),
            metadata: Object.keys(metadata).length > 0 ? metadata : undefined,
        });
    });
}

/**
 * Helper to attach error messages to request for analytics
 */
export const attachErrorMessage = (request: FastifyRequest, message: string): void => {
    request._errorMessage = message;
};
