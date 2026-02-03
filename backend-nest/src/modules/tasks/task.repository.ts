import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { BaseRepository } from '../../common/database/base.repository';
import { Task, TaskDocument } from './task.schema';
import { QueryOptions, SafeFilter } from '../../common/database/types';

@Injectable()
export class TaskRepository extends BaseRepository<TaskDocument> {
    constructor(@InjectModel(Task.name) private taskModel: Model<TaskDocument>) {
        super(taskModel);
    }

    /**
     * Find all tasks for a user with optional filters
     */
    async findByUserId(
        userId: string,
        filters?: { status?: string; priority?: string },
        options: QueryOptions = {}
    ): Promise<TaskDocument[]> {
        const filter: SafeFilter<TaskDocument> = {
            userId: { $eq: userId } as any
        };

        if (filters?.status) {
            filter.status = { $eq: filters.status };
        }

        if (filters?.priority) {
            filter.priority = { $eq: filters.priority };
        }

        return this.findMany(filter, {
            sort: { status: 1, order: 1, createdAt: -1 },
            ...options
        });
    }

    /**
     * Find tasks by user and status
     */
    async findByUserAndStatus(userId: string, status: string): Promise<TaskDocument[]> {
        return this.findMany({
            userId: { $eq: userId } as any,
            status: { $eq: status }
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
                userId: { $eq: userId } as any,
                status: { $eq: status }
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
        const bulkOps = updates.map(update => ({
            updateOne: {
                filter: {
                    _id: update.id,
                    userId: { $eq: userId }
                } as any,
                update: {
                    $set: {
                        order: update.order,
                        ...(update.status ? { status: update.status } : {})
                    }
                }
            }
        }));

        await this.bulkWrite(bulkOps as any);
    }

    /**
     * Delete task and verify ownership
     */
    async deleteByIdAndUser(taskId: string, userId: string): Promise<boolean> {
        return this.deleteOne({
            _id: taskId,
            userId: { $eq: userId }
        } as any);
    }

    /**
     * Update task and verify ownership
     */
    async updateByIdAndUser(
        taskId: string,
        userId: string,
        data: Partial<TaskDocument>
    ): Promise<TaskDocument | null> {
        return this.updateOne(
            {
                _id: taskId,
                userId: { $eq: userId }
            } as any,
            { $set: data },
            { returnNew: true }
        );
    }

    /**
     * Find upcoming incomplete tasks with due dates
     */
    async findUpcoming(userId: string, limit: number = 10): Promise<TaskDocument[]> {
        return this.findMany({
            userId: { $eq: userId } as any,
            status: { $ne: 'done' },
            dueDate: { $ne: null }
        } as any, {
            sort: { dueDate: 1 },
            limit: Math.min(limit, 50)
        });
    }
}
