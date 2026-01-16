import { BaseRepository } from './base/BaseRepository';
import GPALog, { IGPALog } from '../models/GPALog';
import { SafeFilter } from './base/types';

/**
 * GPALogRepository handles GPALog database operations
 */
export class GPALogRepository extends BaseRepository<IGPALog> {
    constructor() {
        super(GPALog);
    }

    /**
     * Find all logs by user sorted by semester
     */
    async findByUser(userId: string): Promise<IGPALog[]> {
        return this.findMany({
            userId: { $eq: userId }
        } as unknown as SafeFilter<IGPALog>, {
            sort: { semester: 1 }
        });
    }

    /**
     * Find specific log by user and semester
     */
    async findByUserAndSemester(userId: string, semester: string): Promise<IGPALog | null> {
        return this.findOne({
            userId: { $eq: userId },
            semester: { $eq: semester }
        } as unknown as SafeFilter<IGPALog>);
    }

    /**
     * Upsert a GPA log record
     */
    async upsertLog(
        userId: string,
        semester: string,
        gpa: number,
        recordHash: string
    ): Promise<IGPALog | null> {
        return this.model.findOneAndUpdate(
            { userId, semester },
            { gpa, recordHash },
            { upsert: true, new: true }
        );
    }
}
