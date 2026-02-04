import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { config } from '../config/env';
import {
    verifyAccess,
    getMetrics,
    getMetricsSummary,
    getMetricsTimeseries,
    getLogs,
    getAuditLogs
} from '../controllers/analyticsController';

/**
 * Analytics Routes - Custom password authentication
 * 6 endpoints total
 * Note: Uses custom password verification instead of JWT auth
 */

/**
 * Password verification middleware for analytics access
 * Simple security model: password stored in env var only
 */
const verifyAnalyticsPassword = async (request: FastifyRequest, reply: FastifyReply) => {
    const body = request.body as any;
    const providedPassword = body?.password || request.headers['x-analytics-password'];

    if (!providedPassword || providedPassword !== config.analyticsAccessPassword) {
        return reply.code(401).send({
            success: false,
            error: 'Invalid or missing analytics access password',
        });
    }
};

export default async function analyticsRoutes(fastify: FastifyInstance) {
    const preHandler = [verifyAnalyticsPassword];
    
    // Password verification endpoint (no preHandler)
    fastify.post('/verify-access', {}, verifyAccess);
    
    // Analytics data endpoints (require password verification)
    fastify.get('/metrics', { preHandler }, getMetrics);
    fastify.get('/metrics/summary', { preHandler }, getMetricsSummary);
    fastify.get('/metrics/timeseries', { preHandler }, getMetricsTimeseries);
    fastify.get('/logs', { preHandler }, getLogs);
    fastify.get('/audit-logs', { preHandler }, getAuditLogs);
}
