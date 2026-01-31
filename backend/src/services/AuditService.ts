import { BaseService, ServiceError } from './base/BaseService';
import { AuditLogRepository } from '../repositories/AuditLogRepository';
import { IAuditLog } from '../models/AuditLog';
import logger from '../utils/logger';

/**
 * Audit logs response with pagination info
 */
export interface AuditLogsResponse {
    logs: IAuditLog[];
    total: number;
    hasMore: boolean;
    limit: number;
    offset: number;
}

/**
 * AuditService handles audit log retrieval
 */
export class AuditService extends BaseService<IAuditLog, AuditLogRepository> {
    constructor() {
        super(new AuditLogRepository());
    }

    /**
     * Get audit logs for user with pagination
     */
    async getAuditLogs(
        userId: string,
        limit: number = 50,
        offset: number = 0
    ): Promise<AuditLogsResponse> {
        try {
            // Clamp limit between 1 and 100
            const clampedLimit = Math.min(Math.max(limit, 1), 100);
            // Ensure offset is non-negative
            const clampedOffset = Math.max(offset, 0);

            const [logs, total] = await Promise.all([
                this.repository.findByUser(userId, clampedLimit, clampedOffset),
                this.repository.countByUser(userId)
            ]);

            const hasMore = clampedOffset + logs.length < total;


            return {
                logs,
                total,
                hasMore,
                limit: clampedLimit,
                offset: clampedOffset
            };
        } catch (error) {
            logger.error('Get audit logs error:', error);
            throw new ServiceError('Failed to fetch audit logs', 500);
        }
    }

    /**
     * Get recent activity for dashboard widget
     */
    async getRecentActivity(userId: string, limit: number = 3): Promise<{ logs: IAuditLog[] }> {
        try {
            const logs = await this.repository.getRecentActivity(userId, limit);
            return { logs };
        } catch (error) {
            logger.error('Get recent activity error:', error);
            throw new ServiceError('Failed to fetch recent activity', 500);
        }
    }
}
