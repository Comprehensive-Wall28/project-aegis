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
    last24Hours: {
        errors: number;
        warnings: number;
    };
    byHour: Array<{
        hour: string;
        errors: number;
        warnings: number;
    }>;
    byDay: Array<{
        date: string;
        errors: number;
        warnings: number;
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

                // Top URLs with errors
                this.model.aggregate([
                    { $match: { timestamp: { $gte: startDate }, url: { $exists: true, $ne: null } } },
                    {
                        $group: {
                            _id: '$url',
                            count: { $sum: 1 }
                        }
                    },
                    { $sort: { count: -1 } },
                    { $limit: 10 }
                ]).exec(),

                // Top users with errors
                this.model.aggregate([
                    { $match: { timestamp: { $gte: startDate }, userId: { $exists: true, $ne: null } } },
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
            for (const stat of totalStats) {
                if (stat._id === 'error') errorCount = stat.count;
                if (stat._id === 'warn') warnCount = stat.count;
            }

            // Process last 24 hours
            let errors24h = 0;
            let warnings24h = 0;
            for (const stat of last24HourStats) {
                if (stat._id === 'error') errors24h = stat.count;
                if (stat._id === 'warn') warnings24h = stat.count;
            }

            // Process hourly stats
            const hourlyMap = new Map<string, { errors: number; warnings: number }>();
            for (const stat of hourlyStats) {
                const hour = stat._id.hour;
                if (!hourlyMap.has(hour)) {
                    hourlyMap.set(hour, { errors: 0, warnings: 0 });
                }
                const entry = hourlyMap.get(hour)!;
                if (stat._id.level === 'error') entry.errors = stat.count;
                if (stat._id.level === 'warn') entry.warnings = stat.count;
            }
            const byHour = Array.from(hourlyMap.entries()).map(([hour, counts]) => ({
                hour,
                ...counts
            }));

            // Process daily stats
            const dailyMap = new Map<string, { errors: number; warnings: number }>();
            for (const stat of dailyStats) {
                const date = stat._id.date;
                if (!dailyMap.has(date)) {
                    dailyMap.set(date, { errors: 0, warnings: 0 });
                }
                const entry = dailyMap.get(date)!;
                if (stat._id.level === 'error') entry.errors = stat.count;
                if (stat._id.level === 'warn') entry.warnings = stat.count;
            }
            const byDay = Array.from(dailyMap.entries()).map(([date, counts]) => ({
                date,
                ...counts
            }));

            return {
                totalLogs: errorCount + warnCount,
                errorCount,
                warnCount,
                last24Hours: {
                    errors: errors24h,
                    warnings: warnings24h
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
                levels: ['warn', 'error']
            };
        } catch (error) {
            logger.error('SystemLogRepository getDistinctValues error:', error);
            throw error;
        }
    }
}
