import { Request, Response } from 'express';
import { TaskService, AuditService, ServiceError } from '../services';
import logger from '../utils/logger';

interface AuthRequest extends Request {
    user?: { id: string; username: string };
}

const taskService = new TaskService();
const auditService = new AuditService();

/**
 * Get aggregated dashboard activity (tasks + audit logs)
 * Optimized for performance: fetches only what's needed to fill 3 slots.
 */
export const getDashboardActivity = async (req: AuthRequest, res: Response) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: 'Not authenticated' });
        }

        const userId = req.user.id;
        const limit = 3;

        // 1. Fetch upcoming tasks first (highest priority)
        const tasks = await taskService.getUpcomingTasks(userId, limit);

        // 2. Calculate remaining slots
        const remainingSlots = limit - tasks.length;
        let recentLogs: any[] = [];

        // 3. If we need more items, fetch audit logs
        if (remainingSlots > 0) {
            const auditResult = await auditService.getRecentActivity(userId, remainingSlots);
            recentLogs = auditResult.logs;
        }

        // 4. Return combined result
        res.status(200).json({
            tasks: tasks,
            activities: recentLogs
        });

    } catch (error) {
        if (error instanceof ServiceError) {
            res.status(error.statusCode).json({ message: error.message });
            return;
        }
        logger.error('Dashboard activity fetch error:', error);
        res.status(500).json({ message: 'Failed to fetch dashboard activity' });
    }
};
