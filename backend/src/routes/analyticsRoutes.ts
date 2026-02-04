import express, { Request, Response, NextFunction } from 'express';
import DatabaseManager from '../config/DatabaseManager';
import { config } from '../config/env';

const router = express.Router();

/**
 * Password verification middleware for analytics access
 * Simple security model: password stored in env var only
 */
export const verifyAnalyticsPassword = (req: Request, res: Response, next: NextFunction): void => {
    const providedPassword = req.body?.password || req.headers['x-analytics-password'];

    if (!providedPassword || providedPassword !== config.analyticsAccessPassword) {
        res.status(401).json({
            success: false,
            error: 'Invalid or missing analytics access password',
        });
        return;
    }

    next();
};

/**
 * POST /api/analytics/verify-access
 * Validate analytics access password
 */
router.post('/verify-access', (req: Request, res: Response): void => {
    const { password } = req.body;

    if (!password || password !== config.analyticsAccessPassword) {
        res.status(401).json({
            success: false,
            error: 'Invalid password',
        });
        return;
    }

    res.json({
        success: true,
        message: 'Access granted',
    });
});

/**
 * Helper to get analytics models from secondary connection
 */
const getAnalyticsModels = async () => {
    const secondaryConnection = DatabaseManager.getInstance().getConnection('secondary');

    if (!secondaryConnection) {
        throw new Error('Secondary database not available');
    }

    const ApiMetric = secondaryConnection.model('ApiMetric');
    const LogEntry = secondaryConnection.model('LogEntry');

    return { ApiMetric, LogEntry };
};

/**
 * GET /api/analytics/metrics
 * Query API performance metrics with search and pagination
 * Query params:
 *   - search: Text search across path, method, statusCode, ipAddress
 *   - statusCode: Filter by status code
 *   - page: Page number (default: 1)
 *   - limit: Items per page (default: 100, max: 1000)
 */
router.get('/metrics', verifyAnalyticsPassword, async (req: Request, res: Response): Promise<void> => {
    try {
        const {
            search,
            statusCode,
            startDate,
            endDate,
            page = '1',
            limit = '100'
        } = req.query;

        const { ApiMetric } = await getAnalyticsModels();

        // Build query
        const query: any = {};

        // Comprehensive text search
        if (search) {
            const searchRegex = new RegExp(search as string, 'i');
            const searchNum = parseInt(search as string);

            query.$or = [
                { path: searchRegex },
                { method: searchRegex },
                { ipAddress: searchRegex },
                { userAgent: searchRegex },
            ];

            // Also search by status code if search term is a number
            if (!isNaN(searchNum)) {
                query.$or.push({ statusCode: searchNum });
            }
        }

        if (statusCode) {
            query.statusCode = parseInt(statusCode as string, 10);
        }

        if (startDate || endDate) {
            query.timestamp = {};
            if (startDate) query.timestamp.$gte = new Date(startDate as string);
            if (endDate) query.timestamp.$lte = new Date(endDate as string);
        }

        // Pagination
        const pageNum = Math.max(1, parseInt(page as string, 10));
        const limitNum = Math.min(1000, Math.max(1, parseInt(limit as string, 10)));
        const skip = (pageNum - 1) * limitNum;

        // Execute query - always return latest first
        const [metrics, total] = await Promise.all([
            ApiMetric.find(query)
                .sort({ timestamp: -1 })
                .skip(skip)
                .limit(limitNum)
                .lean(),
            ApiMetric.countDocuments(query),
        ]);

        res.json({
            success: true,
            data: metrics,
            pagination: {
                page: pageNum,
                limit: limitNum,
                total,
                pages: Math.ceil(total / limitNum),
            },
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Failed to fetch metrics',
            details: error instanceof Error ? error.message : 'Unknown error',
        });
    }
});

/**
 * GET /api/analytics/metrics/summary
 * Get aggregated metrics summary with optional search
 */
router.get('/metrics/summary', verifyAnalyticsPassword, async (req: Request, res: Response): Promise<void> => {
    try {
        const { search, startDate, endDate } = req.query;

        const { ApiMetric } = await getAnalyticsModels();

        // Build search filter
        const searchFilter: any = {};
        if (search) {
            const searchRegex = new RegExp(search as string, 'i');
            const searchNum = parseInt(search as string);

            searchFilter.$or = [
                { path: searchRegex },
                { method: searchRegex },
                { ipAddress: searchRegex },
            ];

            if (!isNaN(searchNum)) {
                searchFilter.$or.push({ statusCode: searchNum });
            }
        }

        if (startDate || endDate) {
            searchFilter.timestamp = {};
            if (startDate) searchFilter.timestamp.$gte = new Date(startDate as string);
            if (endDate) searchFilter.timestamp.$lte = new Date(endDate as string);
        }

        // Aggregation pipeline for summary stats
        const [summary, statusDistribution, topPaths] = await Promise.all([
            // Overall summary
            ApiMetric.aggregate([
                { $match: searchFilter },
                {
                    $group: {
                        _id: null,
                        totalRequests: { $sum: 1 },
                        avgDurationMs: { $avg: '$durationMs' },
                        maxDurationMs: { $max: '$durationMs' },
                        minDurationMs: { $min: '$durationMs' },
                        errorCount: {
                            $sum: {
                                $cond: [{ $gte: ['$statusCode', 400] }, 1, 0]
                            }
                        },
                        uniqueUsers: { $addToSet: '$userId' },
                    }
                },
                {
                    $project: {
                        _id: 0,
                        totalRequests: 1,
                        avgDurationMs: { $round: ['$avgDurationMs', 2] },
                        maxDurationMs: 1,
                        minDurationMs: 1,
                        errorCount: 1,
                        errorRate: {
                            $round: [
                                { $multiply: [{ $divide: ['$errorCount', '$totalRequests'] }, 100] },
                                2
                            ]
                        },
                        // Filter out null from uniqueUsers array and count
                        uniqueUserCount: {
                            $size: {
                                $filter: {
                                    input: '$uniqueUsers',
                                    cond: { $ne: ['$$this', null] }
                                }
                            }
                        },
                    }
                }
            ]),

            // Status code distribution
            ApiMetric.aggregate([
                { $match: searchFilter },
                {
                    $group: {
                        _id: '$statusCode',
                        count: { $sum: 1 }
                    }
                },
                { $sort: { count: -1 } }
            ]),

            // Top 10 most hit paths
            ApiMetric.aggregate([
                { $match: searchFilter },
                {
                    $group: {
                        _id: { path: '$path', method: '$method' },
                        count: { $sum: 1 },
                        avgDuration: { $avg: '$durationMs' }
                    }
                },
                { $sort: { count: -1 } },
                { $limit: 10 }
            ])
        ]);

        res.json({
            success: true,
            data: {
                summary: summary[0] || {
                    totalRequests: 0,
                    avgDurationMs: 0,
                    errorCount: 0,
                    errorRate: 0,
                    uniqueUserCount: 0,
                },
                statusDistribution,
                topPaths: topPaths.map(p => ({
                    path: p._id.path,
                    method: p._id.method,
                    count: p.count,
                    avgDurationMs: Math.round(p.avgDuration * 100) / 100
                })),
            },
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Failed to fetch metrics summary',
            details: error instanceof Error ? error.message : 'Unknown error',
        });
    }
});

/**
 * GET /api/analytics/metrics/timeseries
 * Get time-series data for charts with optional search
 */
router.get('/metrics/timeseries', verifyAnalyticsPassword, async (req: Request, res: Response): Promise<void> => {
    try {
        const { search, interval = '1h', hours = '24', startDate, endDate } = req.query;

        const { ApiMetric } = await getAnalyticsModels();

        // Build search filter
        const searchFilter: any = {};

        if (startDate || endDate) {
            searchFilter.timestamp = {};
            if (startDate) searchFilter.timestamp.$gte = new Date(startDate as string);
            if (endDate) searchFilter.timestamp.$lte = new Date(endDate as string);
        } else {
            // Default to last N hours if no date range provided
            const hoursNum = parseInt(hours as string) || 24;
            const startTime = new Date(Date.now() - hoursNum * 60 * 60 * 1000);
            searchFilter.timestamp = { $gte: startTime };
        }

        if (search) {
            const searchRegex = new RegExp(search as string, 'i');
            const searchNum = parseInt(search as string);

            searchFilter.$or = [
                { path: searchRegex },
                { method: searchRegex },
                { ipAddress: searchRegex },
            ];

            if (!isNaN(searchNum)) {
                searchFilter.$or.push({ statusCode: searchNum });
            }
        }

        // Determine date format based on interval
        let dateFormat: string;
        switch (interval) {
            case '1m':
                dateFormat = '%Y-%m-%d %H:%M';
                break;
            case '1h':
                dateFormat = '%Y-%m-%d %H:00';
                break;
            case '1d':
                dateFormat = '%Y-%m-%d';
                break;
            default:
                dateFormat = '%Y-%m-%d %H:00';
        }

        const timeseries = await ApiMetric.aggregate([
            { $match: searchFilter },
            {
                $group: {
                    _id: {
                        $dateToString: {
                            format: dateFormat,
                            date: '$timestamp'
                        }
                    },
                    requests: { $sum: 1 },
                    avgDurationMs: { $avg: '$durationMs' },
                    errors: {
                        $sum: {
                            $cond: [{ $gte: ['$statusCode', 400] }, 1, 0]
                        }
                    },
                    uniqueUsers: { $addToSet: '$userId' }
                }
            },
            {
                $project: {
                    _id: 0,
                    timestamp: '$_id',
                    requests: 1,
                    avgDurationMs: { $round: ['$avgDurationMs', 2] },
                    errors: 1,
                    uniqueUsers: { $size: '$uniqueUsers' }
                }
            },
            { $sort: { timestamp: 1 } }
        ]);

        res.json({
            success: true,
            data: timeseries,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Failed to fetch timeseries data',
            details: error instanceof Error ? error.message : 'Unknown error',
        });
    }
});

/**
 * GET /api/analytics/logs
 * Query structured logs with search and pagination
 * Query params:
 *   - search: Text search across message, source, level, metadata
 *   - level: INFO, WARN, ERROR
 *   - page: Page number (default: 1)
 *   - limit: Items per page (default: 100, max: 1000)
 */
router.get('/logs', verifyAnalyticsPassword, async (req: Request, res: Response): Promise<void> => {
    try {
        const {
            search,
            level,
            page = '1',
            limit = '100'
        } = req.query;

        const { LogEntry } = await getAnalyticsModels();

        // Build query
        const query: any = {};

        // Comprehensive text search
        if (search) {
            const searchRegex = new RegExp(search as string, 'i');
            query.$or = [
                { message: searchRegex },
                { source: searchRegex },
                { 'metadata.service': searchRegex },
            ];
        }

        if (level) {
            query.level = (level as string).toUpperCase();
        }

        // Pagination
        const pageNum = Math.max(1, parseInt(page as string, 10));
        const limitNum = Math.min(1000, Math.max(1, parseInt(limit as string, 10)));
        const skip = (pageNum - 1) * limitNum;

        // Execute query - always return latest first
        const [logs, total] = await Promise.all([
            LogEntry.find(query)
                .sort({ timestamp: -1 })
                .skip(skip)
                .limit(limitNum)
                .lean(),
            LogEntry.countDocuments(query),
        ]);

        res.json({
            success: true,
            data: logs,
            pagination: {
                page: pageNum,
                limit: limitNum,
                total,
                pages: Math.ceil(total / limitNum),
            },
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Failed to fetch logs',
            details: error instanceof Error ? error.message : 'Unknown error',
        });
    }
});

/**
 * GET /api/analytics/audit-logs
 * Query system-wide audit logs for analytics with search and pagination
 * Query params:
 *   - search: Text search across action, identifier, ipAddress, and metadata
 *   - status: SUCCESS or FAILURE
 *   - page: Page number (default: 1)
 *   - limit: Items per page (default: 100, max: 1000)
 */
router.get('/audit-logs', verifyAnalyticsPassword, async (req: Request, res: Response): Promise<void> => {
    try {
        const {
            search,
            status,
            page = '1',
            limit = '100'
        } = req.query;

        // Get AuditLog model from the secondary connection (where audit logs are stored)
        const { DatabaseManager } = await import('../config/DatabaseManager');
        const dbManager = DatabaseManager.getInstance();
        const secondaryConnection = dbManager.getConnection('secondary');

        const { AuditLogSchema } = await import('../models/AuditLog');
        const AuditLog = secondaryConnection.models['AuditLog'] || secondaryConnection.model('AuditLog', AuditLogSchema);

        // Build query
        const query: any = {};

        // Comprehensive text search across multiple fields
        if (search) {
            const searchRegex = new RegExp(search as string, 'i');
            // Note: userId is ObjectId so we can't regex search it
            // We search on text fields only
            query.$or = [
                { action: searchRegex },
                { identifier: searchRegex },
                { ipAddress: searchRegex },
                { 'metadata.email': searchRegex },
                { 'metadata.userAgent': searchRegex },
                { 'metadata.path': searchRegex },
                { 'metadata.method': searchRegex },
            ];
        }

        if (status) {
            query.status = status as string;
        }

        // Pagination
        const pageNum = Math.max(1, parseInt(page as string, 10));
        const limitNum = Math.min(1000, Math.max(1, parseInt(limit as string, 10)));
        const skip = (pageNum - 1) * limitNum;

        // Execute query - always return latest first
        const [logs, total] = await Promise.all([
            AuditLog.find(query)
                .sort({ timestamp: -1 })
                .skip(skip)
                .limit(limitNum)
                .lean(),
            AuditLog.countDocuments(query),
        ]);

        res.json({
            success: true,
            data: logs,
            pagination: {
                page: pageNum,
                limit: limitNum,
                total,
                pages: Math.ceil(total / limitNum),
            },
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Failed to fetch audit logs',
            details: error instanceof Error ? error.message : 'Unknown error',
        });
    }
});

export default router;
