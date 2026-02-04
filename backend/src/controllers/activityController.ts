import { FastifyRequest, FastifyReply } from 'fastify';
import { TaskService, AuditService } from '../services';

const taskService = new TaskService();
const auditService = new AuditService();

/**
 * Get aggregated dashboard activity (tasks + audit logs)
 * Optimized for performance: fetches only what's needed to fill 3 slots.
 */
export const getDashboardActivity = async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user as any;
    const userId = user?.id || user?._id;
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
    reply.code(200).send({
        tasks: tasks,
        activities: recentLogs
    });
};
