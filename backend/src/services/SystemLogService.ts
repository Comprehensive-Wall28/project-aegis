import { BaseService, ServiceError } from './base/BaseService';
import { SystemLogRepository, SystemLogFilterOptions, SystemLogPaginationOptions, SystemLogStats, PerformanceStats, EndpointPerformance, PerformanceTrendPoint, SlowestRequest } from '../repositories/SystemLogRepository';
import { ISystemLog, LogLevel } from '../models/SystemLog';
import logger from '../utils/logger';

/**
 * Query parameters for listing logs
 */
export interface ListLogsParams {
    page?: number;
    limit?: number;
    level?: string;
    startDate?: string;
    endDate?: string;
    userId?: string;
    url?: string;
    search?: string;
    method?: string;
    statusCode?: number;
    sortField?: string;
    sortOrder?: 'asc' | 'desc';
}

/**
 * SystemLogService handles system log retrieval business logic
 * Read-only service - no create/update/delete operations exposed
 */
export class SystemLogService extends BaseService<ISystemLog, SystemLogRepository> {
    constructor() {
        super(new SystemLogRepository());
    }

    /**
     * Validate and sanitize query parameters
     */
    private validateParams(params: ListLogsParams): {
        filters: SystemLogFilterOptions;
        pagination: SystemLogPaginationOptions;
    } {
        const page = Math.max(1, parseInt(String(params.page || 1), 10) || 1);
        const limit = Math.min(100, Math.max(1, parseInt(String(params.limit || 50), 10) || 50));

        const filters: SystemLogFilterOptions = {};

        // Validate level - now includes 'info'
        if (params.level) {
            if (!['info', 'warn', 'error'].includes(params.level)) {
                throw new ServiceError('Invalid level. Must be "info", "warn", or "error"', 400);
            }
            filters.level = params.level as LogLevel;
        }

        // Validate dates
        if (params.startDate) {
            const startDate = new Date(params.startDate);
            if (isNaN(startDate.getTime())) {
                throw new ServiceError('Invalid startDate format', 400);
            }
            filters.startDate = startDate;
        }

        if (params.endDate) {
            const endDate = new Date(params.endDate);
            if (isNaN(endDate.getTime())) {
                throw new ServiceError('Invalid endDate format', 400);
            }
            filters.endDate = endDate;
        }

        // Sanitize string filters
        if (params.userId) {
            filters.userId = String(params.userId).trim();
        }

        if (params.url) {
            filters.url = String(params.url).trim();
        }

        if (params.search) {
            // Limit search string length and sanitize
            filters.search = String(params.search).trim().slice(0, 200);
        }

        if (params.method) {
            filters.method = String(params.method).toUpperCase().trim();
        }

        if (params.statusCode) {
            const code = parseInt(String(params.statusCode), 10);
            if (!isNaN(code) && code >= 100 && code < 600) {
                filters.statusCode = code;
            }
        }

        // Validate sort
        const validSortFields = ['timestamp', 'level', 'statusCode', 'method', 'duration'];
        const sortField = validSortFields.includes(params.sortField || '') 
            ? params.sortField! 
            : 'timestamp';
        const sortOrder = params.sortOrder === 'asc' ? 1 : -1;

        return {
            filters,
            pagination: { page, limit, sortField, sortOrder }
        };
    }

    /**
     * Get paginated logs with filters
     */
    async getLogs(params: ListLogsParams): Promise<{
        items: ISystemLog[];
        total: number;
        totalPages: number;
        page: number;
        limit: number;
    }> {
        try {
            const { filters, pagination } = this.validateParams(params);
            const result = await this.repository.findPaginatedWithFilters(filters, pagination);

            return {
                ...result,
                page: pagination.page,
                limit: pagination.limit
            };
        } catch (error) {
            if (error instanceof ServiceError) throw error;
            logger.error('SystemLogService getLogs error:', error);
            throw new ServiceError('Failed to retrieve logs', 500);
        }
    }

    /**
     * Get a single log by ID
     */
    async getLogById(logId: string): Promise<ISystemLog> {
        try {
            const validId = this.validateId(logId, 'Log ID');
            const log = await this.repository.findById(validId);

            if (!log) {
                throw new ServiceError('Log not found', 404);
            }

            return log;
        } catch (error) {
            if (error instanceof ServiceError) throw error;
            logger.error('SystemLogService getLogById error:', error);
            throw new ServiceError('Failed to retrieve log', 500);
        }
    }

    /**
     * Get aggregated statistics for dashboard
     */
    async getStats(days: number = 7): Promise<SystemLogStats> {
        try {
            // Validate days parameter
            const validDays = Math.min(30, Math.max(1, parseInt(String(days), 10) || 7));
            return await this.repository.getAggregatedStats(validDays);
        } catch (error) {
            logger.error('SystemLogService getStats error:', error);
            throw new ServiceError('Failed to retrieve statistics', 500);
        }
    }

    /**
     * Get distinct values for filter dropdowns
     */
    async getFilterOptions(): Promise<{
        methods: string[];
        statusCodes: number[];
        levels: string[];
    }> {
        try {
            return await this.repository.getDistinctValues();
        } catch (error) {
            logger.error('SystemLogService getFilterOptions error:', error);
            throw new ServiceError('Failed to retrieve filter options', 500);
        }
    }

    /**
     * Get comprehensive performance statistics
     */
    async getPerformanceStats(hours: number = 24): Promise<PerformanceStats> {
        try {
            const validHours = Math.min(168, Math.max(1, parseInt(String(hours), 10) || 24)); // Max 7 days
            return await this.repository.getPerformanceStats(validHours);
        } catch (error) {
            logger.error('SystemLogService getPerformanceStats error:', error);
            throw new ServiceError('Failed to retrieve performance statistics', 500);
        }
    }

    /**
     * Get per-endpoint performance breakdown
     */
    async getEndpointPerformance(hours: number = 24, limit: number = 20): Promise<EndpointPerformance[]> {
        try {
            const validHours = Math.min(168, Math.max(1, parseInt(String(hours), 10) || 24));
            const validLimit = Math.min(50, Math.max(1, parseInt(String(limit), 10) || 20));
            return await this.repository.getEndpointPerformance(validHours, validLimit);
        } catch (error) {
            logger.error('SystemLogService getEndpointPerformance error:', error);
            throw new ServiceError('Failed to retrieve endpoint performance', 500);
        }
    }

    /**
     * Get performance trends over time
     */
    async getPerformanceTrends(hours: number = 24): Promise<PerformanceTrendPoint[]> {
        try {
            const validHours = Math.min(168, Math.max(1, parseInt(String(hours), 10) || 24));
            return await this.repository.getPerformanceTrends(validHours);
        } catch (error) {
            logger.error('SystemLogService getPerformanceTrends error:', error);
            throw new ServiceError('Failed to retrieve performance trends', 500);
        }
    }

    /**
     * Get slowest requests
     */
    async getSlowestRequests(hours: number = 24, limit: number = 20): Promise<SlowestRequest[]> {
        try {
            const validHours = Math.min(168, Math.max(1, parseInt(String(hours), 10) || 24));
            const validLimit = Math.min(50, Math.max(1, parseInt(String(limit), 10) || 20));
            return await this.repository.getSlowestRequests(validHours, validLimit);
        } catch (error) {
            logger.error('SystemLogService getSlowestRequests error:', error);
            throw new ServiceError('Failed to retrieve slowest requests', 500);
        }
    }
}
