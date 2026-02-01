import { BaseService, ServiceError } from './base/BaseService';
import { SystemLogRepository, SystemLogFilterOptions, SystemLogPaginationOptions, SystemLogStats } from '../repositories/SystemLogRepository';
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

        // Validate level
        if (params.level) {
            if (!['warn', 'error'].includes(params.level)) {
                throw new ServiceError('Invalid level. Must be "warn" or "error"', 400);
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
        const validSortFields = ['timestamp', 'level', 'statusCode', 'method'];
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
}
