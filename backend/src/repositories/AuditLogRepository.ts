import { BaseRepository } from './base/BaseRepository';
import { IAuditLog, AuditLogSchema } from '../models/AuditLog';
import { SafeFilter } from './base/types';
import { DatabaseManager } from '../config/DatabaseManager';

/**
 * AuditLogRepository handles AuditLog database operations
 */
export class AuditLogRepository extends BaseRepository<IAuditLog> {
    constructor() {
        const dbManager = DatabaseManager.getInstance();
        const connection = dbManager.getConnection('secondary');
        const model = connection.model<IAuditLog>('AuditLog', AuditLogSchema);
        super(model, 'secondary');
    }

    /**
     * Find audit logs by user with pagination
     */
    async findByUser(
        userId: string,
        limit: number = 50,
        offset: number = 0
    ): Promise<IAuditLog[]> {
        return this.findMany({
            userId: { $eq: userId }
        } as unknown as SafeFilter<IAuditLog>, {
            sort: { timestamp: -1 },
            skip: offset,
            limit,
            lean: true
        });
    }

    /**
     * Count audit logs for user
     */
    async countByUser(userId: string): Promise<number> {
        return this.count({
            userId: { $eq: userId }
        } as unknown as SafeFilter<IAuditLog>);
    }

    /**
     * Get recent activity for user
     */
    async getRecentActivity(userId: string, limit: number = 3): Promise<IAuditLog[]> {
        return this.findMany({
            userId: { $eq: userId }
        } as unknown as SafeFilter<IAuditLog>, {
            sort: { timestamp: -1 },
            limit,
            lean: true
        });
    }
}
