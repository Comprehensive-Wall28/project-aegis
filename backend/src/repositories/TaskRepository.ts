import { BaseRepository } from './base/BaseRepository';
import Task, { ITask } from '../models/Task';
import { QueryOptions, SafeFilter } from './base/types';

/**
 * TaskRepository handles all Task-related database operations
 */
export class TaskRepository extends BaseRepository<ITask> {
    constructor() {
        super(Task);
    }

    /**
     * Find all tasks for a user with optional filters
     */
    async findByUserId(
        userId: string,
        filters?: { status?: string; priority?: string },
        options: QueryOptions = {}
    ): Promise<ITask[]> {
        const filter: SafeFilter<ITask> = {
            userId: { $eq: userId }
        };

        if (filters?.status) {
            filter.status = { $eq: filters.status as any };
        }

        if (filters?.priority) {
            filter.priority = { $eq: filters.priority as any };
        }

        return this.findMany(filter, {
            sort: { status: 1, order: 1, createdAt: -1 },
            ...options
        });
    }

    /**
     * Find tasks by user and status
     */
    async findByUserAndStatus(userId: string, status: string): Promise<ITask[]> {
        return this.findMany({
            userId: { $eq: userId },
            status: { $eq: status as any }
        }, {
            sort: { order: 1 }
        });
    }

    /**
     * Get the maximum order value for a user's tasks in a specific status column
     */
    async getMaxOrderInColumn(userId: string, status: string): Promise<number> {
        const result = await this.findOne(
            {
                userId: { $eq: userId },
                status: { $eq: status as any }
            },
            {
                sort: { order: -1 },
                select: 'order'
            }
        );

        return result?.order ?? -1;
    }

    /**
     * Bulk reorder tasks
     */
    async reorderBulk(
        userId: string,
        updates: Array<{ id: string; status?: string; order: number }>
    ): Promise<void> {
        return this.withTransaction(async (session) => {
            const bulkOps = updates.map(update => ({
                updateOne: {
                    filter: {
                        _id: update.id,
                        userId: { $eq: userId }
                    } as SafeFilter<ITask>,
                    update: {
                        $set: {
                            order: update.order,
                            ...(update.status ? { status: update.status } : {})
                        }
                    }
                }
            }));

            await this.bulkWrite(bulkOps, { session });
        });
    }

    /**
     * Delete task and verify ownership
     */
    async deleteByIdAndUser(taskId: string, userId: string): Promise<boolean> {
        return this.deleteOne({
            _id: taskId,
            userId: { $eq: userId }
        } as SafeFilter<ITask>);
    }

    /**
     * Update task and verify ownership
     */
    async updateByIdAndUser(
        taskId: string,
        userId: string,
        data: Partial<ITask>
    ): Promise<ITask | null> {
        return this.updateOne(
            {
                _id: taskId,
                userId: { $eq: userId }
            } as SafeFilter<ITask>,
            { $set: data },
            { returnNew: true }
        );
    }

    /**
     * Find all tasks that mention a specific entity ID
     */
    async findMentionsOf(userId: string, targetId: string): Promise<ITask[]> {
        return this.findMany({
            userId: { $eq: userId },
            mentions: { $in: [targetId] }
        } as unknown as SafeFilter<ITask>);
    }

    /**
     * Find upcoming incomplete tasks with due dates (for dashboard widget)
     */
    async findUpcoming(userId: string, limit: number = 10): Promise<ITask[]> {
        const now = new Date();

        return this.findMany({
            userId: { $eq: userId },
            status: { $ne: 'done' as any },
            dueDate: { $gte: now }
        } as unknown as SafeFilter<ITask>, {
            sort: { dueDate: 1 },
            limit: Math.min(limit, 50)
        });
    }
}
