import { BaseRepository } from './base/BaseRepository';
import SystemLogModel, { ISystemLog, LogLevel } from '../models/SystemLog';
import { SafeFilter } from './base/types';
import logger from '../utils/logger';

/**
 * Filter options for querying system logs
 */
export interface SystemLogFilterOptions {
    level?: LogLevel;
    startDate?: Date;
    endDate?: Date;
    userId?: string;
    url?: string;
    search?: string; // Text search on message field
    method?: string;
    statusCode?: number;
}

/**
 * Pagination options for system logs
 */
export interface SystemLogPaginationOptions {
    page: number;
    limit: number;
    sortField?: string;
    sortOrder?: 1 | -1;
}

/**
 * Aggregated stats for dashboard
 */
export interface SystemLogStats {
    totalLogs: number;
    errorCount: number;
    warnCount: number;
    infoCount: number;
    last24Hours: {
        errors: number;
        warnings: number;
        info: number;
    };
    byHour: Array<{
        hour: string;
        errors: number;
        warnings: number;
        info: number;
    }>;
    byDay: Array<{
        date: string;
        errors: number;
        warnings: number;
        info: number;
    }>;
    topUrls: Array<{
        url: string;
        count: number;
    }>;
    topUsers: Array<{
        userId: string;
        count: number;
    }>;
}

/**
 * Performance statistics
 */
export interface PerformanceStats {
    totalRequests: number;
    avgDuration: number;
    minDuration: number;
    maxDuration: number;
    p50Duration: number;
    p90Duration: number;
    p99Duration: number;
    errorRate: number;
    avgRequestSize: number;
    avgResponseSize: number;
    avgMemoryUsage: number;
}

/**
 * Per-endpoint performance breakdown
 */
export interface EndpointPerformance {
    url: string;
    method: string;
    count: number;
    avgDuration: number;
    minDuration: number;
    maxDuration: number;
    p50Duration: number;
    p90Duration: number;
    p99Duration: number;
    errorCount: number;
    errorRate: number;
}

/**
 * Performance time series data point
 */
export interface PerformanceTrendPoint {
    timestamp: string;
    avgDuration: number;
    requestCount: number;
    errorCount: number;
    p95Duration: number;
}

/**
 * Slowest request entry
 */
export interface SlowestRequest {
    _id: string;
    url: string;
    method: string;
    duration: number;
    statusCode: number;
    timestamp: Date;
    userId?: string;
}

/**
 * SystemLogRepository handles all SystemLog database operations
 * Uses secondary database connection for isolation from main data
 */
export class SystemLogRepository extends BaseRepository<ISystemLog> {
    constructor() {
        // Use secondary database for system logs
        super(SystemLogModel, 'secondary');
    }

    /**
     * Build filter query from options
     */
    private buildFilterQuery(filters: SystemLogFilterOptions): Record<string, any> {
        const query: Record<string, any> = {};

        if (filters.level) {
            query.level = { $eq: filters.level };
        }

        if (filters.startDate || filters.endDate) {
            query.timestamp = {};
            if (filters.startDate) {
                query.timestamp.$gte = filters.startDate;
            }
            if (filters.endDate) {
                query.timestamp.$lte = filters.endDate;
            }
        }

        if (filters.userId) {
            query.userId = { $eq: filters.userId };
        }

        if (filters.url) {
            // Use regex for partial URL matching
            query.url = { $regex: filters.url, $options: 'i' };
        }

        if (filters.method) {
            query.method = { $eq: filters.method };
        }

        if (filters.statusCode) {
            query.statusCode = { $eq: filters.statusCode };
        }

        if (filters.search) {
            // Use regex for message search (case-insensitive)
            query.message = { $regex: filters.search, $options: 'i' };
        }

        return query;
    }

    /**
     * Find logs with pagination and filtering
     */
    async findPaginatedWithFilters(
        filters: SystemLogFilterOptions,
        pagination: SystemLogPaginationOptions
    ): Promise<{ items: ISystemLog[]; total: number; totalPages: number }> {
        const { page, limit, sortField = 'timestamp', sortOrder = -1 } = pagination;
        const query = this.buildFilterQuery(filters);

        try {
            const [items, total] = await Promise.all([
                this.model
                    .find(query)
                    .sort({ [sortField]: sortOrder })
                    .skip((page - 1) * limit)
                    .limit(limit)
                    .lean()
                    .exec(),
                this.model.countDocuments(query).exec()
            ]);

            return {
                items: items as ISystemLog[],
                total,
                totalPages: Math.ceil(total / limit)
            };
        } catch (error) {
            logger.error('SystemLogRepository findPaginatedWithFilters error:', error);
            throw error;
        }
    }

    /**
     * Get aggregated statistics for dashboard
     */
    async getAggregatedStats(days: number = 7): Promise<SystemLogStats> {
        const now = new Date();
        const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
        const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);

        try {
            // Run all aggregations in parallel for performance
            const [
                totalStats,
                last24HourStats,
                hourlyStats,
                dailyStats,
                topUrlsResult,
                topUsersResult
            ] = await Promise.all([
                // Total counts by level
                this.model.aggregate([
                    { $match: { timestamp: { $gte: startDate } } },
                    {
                        $group: {
                            _id: '$level',
                            count: { $sum: 1 }
                        }
                    }
                ]).exec(),

                // Last 24 hours stats
                this.model.aggregate([
                    { $match: { timestamp: { $gte: last24Hours } } },
                    {
                        $group: {
                            _id: '$level',
                            count: { $sum: 1 }
                        }
                    }
                ]).exec(),

                // Hourly breakdown (last 24 hours)
                this.model.aggregate([
                    { $match: { timestamp: { $gte: last24Hours } } },
                    {
                        $group: {
                            _id: {
                                hour: { $dateToString: { format: '%Y-%m-%d %H:00', date: '$timestamp' } },
                                level: '$level'
                            },
                            count: { $sum: 1 }
                        }
                    },
                    { $sort: { '_id.hour': 1 } }
                ]).exec(),

                // Daily breakdown
                this.model.aggregate([
                    { $match: { timestamp: { $gte: startDate } } },
                    {
                        $group: {
                            _id: {
                                date: { $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } },
                                level: '$level'
                            },
                            count: { $sum: 1 }
                        }
                    },
                    { $sort: { '_id.date': 1 } }
                ]).exec(),

                // Top URLs with errors (only warn/error)
                this.model.aggregate([
                    { $match: { timestamp: { $gte: startDate }, url: { $exists: true, $ne: null }, level: { $in: ['warn', 'error'] } } },
                    {
                        $group: {
                            _id: '$url',
                            count: { $sum: 1 }
                        }
                    },
                    { $sort: { count: -1 } },
                    { $limit: 10 }
                ]).exec(),

                // Top users with errors (only warn/error)
                this.model.aggregate([
                    { $match: { timestamp: { $gte: startDate }, userId: { $exists: true, $ne: null }, level: { $in: ['warn', 'error'] } } },
                    {
                        $group: {
                            _id: '$userId',
                            count: { $sum: 1 }
                        }
                    },
                    { $sort: { count: -1 } },
                    { $limit: 10 }
                ]).exec()
            ]);

            // Process total stats
            let errorCount = 0;
            let warnCount = 0;
            let infoCount = 0;
            for (const stat of totalStats) {
                if (stat._id === 'error') errorCount = stat.count;
                if (stat._id === 'warn') warnCount = stat.count;
                if (stat._id === 'info') infoCount = stat.count;
            }

            // Process last 24 hours
            let errors24h = 0;
            let warnings24h = 0;
            let info24h = 0;
            for (const stat of last24HourStats) {
                if (stat._id === 'error') errors24h = stat.count;
                if (stat._id === 'warn') warnings24h = stat.count;
                if (stat._id === 'info') info24h = stat.count;
            }

            // Process hourly stats
            const hourlyMap = new Map<string, { errors: number; warnings: number; info: number }>();
            for (const stat of hourlyStats) {
                const hour = stat._id.hour;
                if (!hourlyMap.has(hour)) {
                    hourlyMap.set(hour, { errors: 0, warnings: 0, info: 0 });
                }
                const entry = hourlyMap.get(hour)!;
                if (stat._id.level === 'error') entry.errors = stat.count;
                if (stat._id.level === 'warn') entry.warnings = stat.count;
                if (stat._id.level === 'info') entry.info = stat.count;
            }
            const byHour = Array.from(hourlyMap.entries()).map(([hour, counts]) => ({
                hour,
                ...counts
            }));

            // Process daily stats
            const dailyMap = new Map<string, { errors: number; warnings: number; info: number }>();
            for (const stat of dailyStats) {
                const date = stat._id.date;
                if (!dailyMap.has(date)) {
                    dailyMap.set(date, { errors: 0, warnings: 0, info: 0 });
                }
                const entry = dailyMap.get(date)!;
                if (stat._id.level === 'error') entry.errors = stat.count;
                if (stat._id.level === 'warn') entry.warnings = stat.count;
                if (stat._id.level === 'info') entry.info = stat.count;
            }
            const byDay = Array.from(dailyMap.entries()).map(([date, counts]) => ({
                date,
                ...counts
            }));

            return {
                totalLogs: errorCount + warnCount + infoCount,
                errorCount,
                warnCount,
                infoCount,
                last24Hours: {
                    errors: errors24h,
                    warnings: warnings24h,
                    info: info24h
                },
                byHour,
                byDay,
                topUrls: topUrlsResult.map((r: any) => ({ url: r._id, count: r.count })),
                topUsers: topUsersResult.map((r: any) => ({ userId: r._id, count: r.count }))
            };
        } catch (error) {
            logger.error('SystemLogRepository getAggregatedStats error:', error);
            throw error;
        }
    }

    /**
     * Get distinct values for filter dropdowns
     */
    async getDistinctValues(): Promise<{
        methods: string[];
        statusCodes: number[];
        levels: string[];
    }> {
        try {
            const [methods, statusCodes] = await Promise.all([
                this.model.distinct('method').exec(),
                this.model.distinct('statusCode').exec()
            ]);

            return {
                methods: methods.filter(Boolean),
                statusCodes: statusCodes.filter(Boolean).sort((a, b) => a - b),
                levels: ['info', 'warn', 'error']
            };
        } catch (error) {
            logger.error('SystemLogRepository getDistinctValues error:', error);
            throw error;
        }
    }

    /**
     * Get comprehensive performance statistics
     */
    async getPerformanceStats(hours: number = 24): Promise<PerformanceStats> {
        const startDate = new Date(Date.now() - hours * 60 * 60 * 1000);

        try {
            // Only consider logs with duration (performance data)
            const matchStage = {
                $match: {
                    timestamp: { $gte: startDate },
                    duration: { $exists: true, $ne: null }
                }
            };

            const [basicStats, percentiles, errorStats] = await Promise.all([
                // Basic statistics
                this.model.aggregate([
                    matchStage,
                    {
                        $group: {
                            _id: null,
                            totalRequests: { $sum: 1 },
                            avgDuration: { $avg: '$duration' },
                            minDuration: { $min: '$duration' },
                            maxDuration: { $max: '$duration' },
                            avgRequestSize: { $avg: { $ifNull: ['$requestSize', 0] } },
                            avgResponseSize: { $avg: { $ifNull: ['$responseSize', 0] } },
                            avgMemoryUsage: { $avg: { $ifNull: ['$memoryUsage', 0] } }
                        }
                    }
                ]).exec(),

                // Percentile calculation using $percentile (MongoDB 7.0+) or bucket approach
                this.model.aggregate([
                    matchStage,
                    { $sort: { duration: 1 } },
                    {
                        $group: {
                            _id: null,
                            durations: { $push: '$duration' }
                        }
                    },
                    {
                        $project: {
                            count: { $size: '$durations' },
                            p50Index: { $floor: { $multiply: [{ $size: '$durations' }, 0.5] } },
                            p90Index: { $floor: { $multiply: [{ $size: '$durations' }, 0.9] } },
                            p99Index: { $floor: { $multiply: [{ $size: '$durations' }, 0.99] } },
                            durations: 1
                        }
                    },
                    {
                        $project: {
                            p50: { $arrayElemAt: ['$durations', '$p50Index'] },
                            p90: { $arrayElemAt: ['$durations', '$p90Index'] },
                            p99: { $arrayElemAt: ['$durations', '$p99Index'] }
                        }
                    }
                ]).exec(),

                // Error rate
                this.model.aggregate([
                    matchStage,
                    {
                        $group: {
                            _id: null,
                            total: { $sum: 1 },
                            errors: {
                                $sum: {
                                    $cond: [{ $gte: ['$statusCode', 400] }, 1, 0]
                                }
                            }
                        }
                    }
                ]).exec()
            ]);

            const basic = basicStats[0] || {};
            const pctls = percentiles[0] || {};
            const errors = errorStats[0] || {};

            return {
                totalRequests: basic.totalRequests || 0,
                avgDuration: Math.round(basic.avgDuration || 0),
                minDuration: basic.minDuration || 0,
                maxDuration: basic.maxDuration || 0,
                p50Duration: pctls.p50 || 0,
                p90Duration: pctls.p90 || 0,
                p99Duration: pctls.p99 || 0,
                errorRate: errors.total > 0 ? (errors.errors / errors.total) * 100 : 0,
                avgRequestSize: Math.round(basic.avgRequestSize || 0),
                avgResponseSize: Math.round(basic.avgResponseSize || 0),
                avgMemoryUsage: Math.round(basic.avgMemoryUsage || 0)
            };
        } catch (error) {
            logger.error('SystemLogRepository getPerformanceStats error:', error);
            throw error;
        }
    }

    /**
     * Get per-endpoint performance breakdown
     */
    async getEndpointPerformance(hours: number = 24, limit: number = 20): Promise<EndpointPerformance[]> {
        const startDate = new Date(Date.now() - hours * 60 * 60 * 1000);

        try {
            const results = await this.model.aggregate([
                {
                    $match: {
                        timestamp: { $gte: startDate },
                        duration: { $exists: true, $ne: null },
                        url: { $exists: true, $ne: null }
                    }
                },
                {
                    $group: {
                        _id: { url: '$url', method: '$method' },
                        count: { $sum: 1 },
                        avgDuration: { $avg: '$duration' },
                        minDuration: { $min: '$duration' },
                        maxDuration: { $max: '$duration' },
                        durations: { $push: '$duration' },
                        errorCount: {
                            $sum: { $cond: [{ $gte: ['$statusCode', 400] }, 1, 0] }
                        }
                    }
                },
                {
                    $project: {
                        url: '$_id.url',
                        method: '$_id.method',
                        count: 1,
                        avgDuration: { $round: ['$avgDuration', 0] },
                        minDuration: 1,
                        maxDuration: 1,
                        errorCount: 1,
                        errorRate: {
                            $round: [{ $multiply: [{ $divide: ['$errorCount', '$count'] }, 100] }, 2]
                        },
                        p50Duration: {
                            $arrayElemAt: [
                                '$durations',
                                { $floor: { $multiply: [{ $size: '$durations' }, 0.5] } }
                            ]
                        },
                        p90Duration: {
                            $arrayElemAt: [
                                '$durations',
                                { $floor: { $multiply: [{ $size: '$durations' }, 0.9] } }
                            ]
                        },
                        p99Duration: {
                            $arrayElemAt: [
                                '$durations',
                                { $floor: { $multiply: [{ $size: '$durations' }, 0.99] } }
                            ]
                        }
                    }
                },
                { $sort: { count: -1 } },
                { $limit: limit }
            ]).exec();

            return results.map((r: any) => ({
                url: r.url,
                method: r.method || 'UNKNOWN',
                count: r.count,
                avgDuration: r.avgDuration,
                minDuration: r.minDuration,
                maxDuration: r.maxDuration,
                p50Duration: r.p50Duration || 0,
                p90Duration: r.p90Duration || 0,
                p99Duration: r.p99Duration || 0,
                errorCount: r.errorCount,
                errorRate: r.errorRate
            }));
        } catch (error) {
            logger.error('SystemLogRepository getEndpointPerformance error:', error);
            throw error;
        }
    }

    /**
     * Get performance trends over time (hourly buckets)
     */
    async getPerformanceTrends(hours: number = 24): Promise<PerformanceTrendPoint[]> {
        const startDate = new Date(Date.now() - hours * 60 * 60 * 1000);

        try {
            const results = await this.model.aggregate([
                {
                    $match: {
                        timestamp: { $gte: startDate },
                        duration: { $exists: true, $ne: null }
                    }
                },
                {
                    $group: {
                        _id: {
                            $dateToString: { format: '%Y-%m-%d %H:00', date: '$timestamp' }
                        },
                        avgDuration: { $avg: '$duration' },
                        requestCount: { $sum: 1 },
                        errorCount: {
                            $sum: { $cond: [{ $gte: ['$statusCode', 400] }, 1, 0] }
                        },
                        durations: { $push: '$duration' }
                    }
                },
                {
                    $project: {
                        timestamp: '$_id',
                        avgDuration: { $round: ['$avgDuration', 0] },
                        requestCount: 1,
                        errorCount: 1,
                        p95Duration: {
                            $arrayElemAt: [
                                '$durations',
                                { $floor: { $multiply: [{ $size: '$durations' }, 0.95] } }
                            ]
                        }
                    }
                },
                { $sort: { timestamp: 1 } }
            ]).exec();

            return results.map((r: any) => ({
                timestamp: r.timestamp,
                avgDuration: r.avgDuration,
                requestCount: r.requestCount,
                errorCount: r.errorCount,
                p95Duration: r.p95Duration || 0
            }));
        } catch (error) {
            logger.error('SystemLogRepository getPerformanceTrends error:', error);
            throw error;
        }
    }

    /**
     * Get slowest requests
     */
    async getSlowestRequests(hours: number = 24, limit: number = 20): Promise<SlowestRequest[]> {
        const startDate = new Date(Date.now() - hours * 60 * 60 * 1000);

        try {
            const results = await this.model.aggregate([
                {
                    $match: {
                        timestamp: { $gte: startDate },
                        duration: { $exists: true, $ne: null }
                    }
                },
                { $sort: { duration: -1 } },
                { $limit: limit },
                {
                    $project: {
                        _id: 1,
                        url: 1,
                        method: 1,
                        duration: 1,
                        statusCode: 1,
                        timestamp: 1,
                        userId: 1
                    }
                }
            ]).exec();

            return results.map((r: any) => ({
                _id: r._id.toString(),
                url: r.url || 'unknown',
                method: r.method || 'UNKNOWN',
                duration: r.duration,
                statusCode: r.statusCode || 0,
                timestamp: r.timestamp,
                userId: r.userId
            }));
        } catch (error) {
            logger.error('SystemLogRepository getSlowestRequests error:', error);
            throw error;
        }
    }
}
