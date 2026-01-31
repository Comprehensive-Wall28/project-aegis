import { Controller, Get, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TasksService } from '../tasks/tasks.service';
import { AuditService } from './audit.service';

@Controller('activity')
@UseGuards(JwtAuthGuard)
export class ActivityController {
    constructor(
        private readonly tasksService: TasksService,
        private readonly auditService: AuditService,
    ) { }

    @Get('dashboard')
    async getDashboardActivity(@Request() req: any) {
        const userId = req.user._id;
        const limit = 3;

        // 1. Fetch upcoming tasks first (highest priority)
        // Note: TasksService needs to support limit, or we slice
        const tasks = await this.tasksService.getUpcomingTasks(userId, limit);

        // 2. Calculate remaining slots
        const remainingSlots = limit - tasks.length;
        let recentLogs: any[] = [];

        // 3. If we need more items, fetch audit logs
        if (remainingSlots > 0) {
            const auditResult = await this.auditService.getRecentActivity(userId, remainingSlots);
            recentLogs = auditResult.logs;
        }

        // 4. Return combined result
        return {
            tasks: tasks,
            activities: recentLogs
        };
    }
}
