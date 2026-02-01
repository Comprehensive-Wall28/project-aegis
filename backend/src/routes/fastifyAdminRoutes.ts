import { FastifyInstance } from 'fastify';
import {
    getLogs,
    getLogById,
    getLogStats,
    getFilterOptions,
    getPerformanceStats,
    getEndpointPerformance,
    getPerformanceTrends,
    getSlowestRequests
} from '../controllers/fastifyAdminController';
import { authenticateUser, requireSysAdmin } from '../middleware/fastifyAuthMiddleware';
import { csrfProtection } from '../middleware/fastifyCsrf';

/**
 * Admin routes for system log management and performance analytics
 * All routes require sys_admin role
 */
export async function adminRoutes(app: FastifyInstance) {
    // All admin routes require authentication, sys_admin role, and CSRF protection
    const adminPreHandlers = [authenticateUser, requireSysAdmin, csrfProtection];

    // ============================================
    // System Logs Endpoints
    // ============================================

    // Get aggregated statistics for dashboard
    // Must be registered before /:id to avoid route conflict
    app.get('/logs/stats', {
        preHandler: adminPreHandlers,
        handler: getLogStats
    });

    // Get filter options for dropdowns
    app.get('/logs/filter-options', {
        preHandler: adminPreHandlers,
        handler: getFilterOptions
    });

    // Get paginated logs with filtering
    app.get('/logs', {
        preHandler: adminPreHandlers,
        handler: getLogs
    });

    // Get single log by ID
    app.get('/logs/:id', {
        preHandler: adminPreHandlers,
        handler: getLogById
    });

    // ============================================
    // Performance Analytics Endpoints
    // ============================================

    // Get comprehensive performance statistics
    app.get('/performance/stats', {
        preHandler: adminPreHandlers,
        handler: getPerformanceStats
    });

    // Get per-endpoint performance breakdown
    app.get('/performance/endpoints', {
        preHandler: adminPreHandlers,
        handler: getEndpointPerformance
    });

    // Get performance trends over time
    app.get('/performance/trends', {
        preHandler: adminPreHandlers,
        handler: getPerformanceTrends
    });

    // Get slowest requests
    app.get('/performance/slowest', {
        preHandler: adminPreHandlers,
        handler: getSlowestRequests
    });
}
