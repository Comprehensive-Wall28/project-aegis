import { FastifyReply } from 'fastify';
import { AuthRequest } from '../types/fastify';
import { withAuth } from '../middleware/fastifyControllerWrapper';
import { TaskService, AuditService } from '../services';

const taskService = new TaskService();
const auditService = new AuditService();

export const getDashboardActivity = withAuth(async (request: AuthRequest, reply: FastifyReply) => {
    const userId = request.user!.id;
    const limit = 3;

    const tasks = await taskService.getUpcomingTasks(userId, limit);
    const remainingSlots = limit - tasks.length;
    let recentLogs: any[] = [];

    if (remainingSlots > 0) {
        const auditResult = await auditService.getRecentActivity(userId, remainingSlots);
        recentLogs = auditResult.logs;
    }

    reply.status(200).send({
        tasks: tasks,
        activities: recentLogs
    });
});
