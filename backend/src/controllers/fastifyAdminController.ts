import { FastifyReply } from 'fastify';
import { AuthRequest } from '../types/fastify';
import { withAuth } from '../middleware/fastifyControllerWrapper';
import { SystemLogService } from '../services';

const systemLogService = new SystemLogService();

/**
 * Get paginated system logs with filtering
 * GET /api/admin/logs
 */
export const getLogs = withAuth(async (request: AuthRequest, reply: FastifyReply) => {
    const query = request.query as Record<string, string | undefined>;
    
    const result = await systemLogService.getLogs({
        page: query.page ? parseInt(query.page, 10) : undefined,
        limit: query.limit ? parseInt(query.limit, 10) : undefined,
        level: query.level,
        startDate: query.startDate,
        endDate: query.endDate,
        userId: query.userId,
        url: query.url,
        search: query.search,
        method: query.method,
        statusCode: query.statusCode ? parseInt(query.statusCode, 10) : undefined,
        sortField: query.sortField,
        sortOrder: query.sortOrder as 'asc' | 'desc' | undefined
    });

    reply.send(result);
});

/**
 * Get a single log by ID
 * GET /api/admin/logs/:id
 */
export const getLogById = withAuth(async (request: AuthRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const log = await systemLogService.getLogById(id);
    reply.send(log);
});

/**
 * Get aggregated statistics for dashboard
 * GET /api/admin/logs/stats
 */
export const getLogStats = withAuth(async (request: AuthRequest, reply: FastifyReply) => {
    const query = request.query as { days?: string };
    const days = query.days ? parseInt(query.days, 10) : 7;
    
    const stats = await systemLogService.getStats(days);
    reply.send(stats);
});

/**
 * Get filter options (distinct values for dropdowns)
 * GET /api/admin/logs/filter-options
 */
export const getFilterOptions = withAuth(async (request: AuthRequest, reply: FastifyReply) => {
    const options = await systemLogService.getFilterOptions();
    reply.send(options);
});

// ============================================
// Performance Analytics Endpoints
// ============================================

/**
 * Get comprehensive performance statistics
 * GET /api/admin/performance/stats
 */
export const getPerformanceStats = withAuth(async (request: AuthRequest, reply: FastifyReply) => {
    const query = request.query as { hours?: string };
    const hours = query.hours ? parseInt(query.hours, 10) : 24;
    
    const stats = await systemLogService.getPerformanceStats(hours);
    reply.send(stats);
});

/**
 * Get per-endpoint performance breakdown
 * GET /api/admin/performance/endpoints
 */
export const getEndpointPerformance = withAuth(async (request: AuthRequest, reply: FastifyReply) => {
    const query = request.query as { hours?: string; limit?: string };
    const hours = query.hours ? parseInt(query.hours, 10) : 24;
    const limit = query.limit ? parseInt(query.limit, 10) : 20;
    
    const endpoints = await systemLogService.getEndpointPerformance(hours, limit);
    reply.send(endpoints);
});

/**
 * Get performance trends over time (hourly buckets)
 * GET /api/admin/performance/trends
 */
export const getPerformanceTrends = withAuth(async (request: AuthRequest, reply: FastifyReply) => {
    const query = request.query as { hours?: string };
    const hours = query.hours ? parseInt(query.hours, 10) : 24;
    
    const trends = await systemLogService.getPerformanceTrends(hours);
    reply.send(trends);
});

/**
 * Get slowest requests
 * GET /api/admin/performance/slowest
 */
export const getSlowestRequests = withAuth(async (request: AuthRequest, reply: FastifyReply) => {
    const query = request.query as { hours?: string; limit?: string };
    const hours = query.hours ? parseInt(query.hours, 10) : 24;
    const limit = query.limit ? parseInt(query.limit, 10) : 20;
    
    const slowest = await systemLogService.getSlowestRequests(hours, limit);
    reply.send(slowest);
});
