import { Injectable } from '@nestjs/common';
import { BaseService } from '../../common/services/base.service';
import { TaskDocument } from './task.schema';
import { TaskRepository } from './task.repository';
import { ServiceError } from '../../common/services/service.error';
import { AuditAction, AuditStatus } from '../../common/services/base.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { ReorderUpdateItemDto } from './dto/reorder-task.dto';
import { TaskFilterDto } from './dto/task-filter.dto';

const VALID_PRIORITIES = ['high', 'medium', 'low'] as const;
const VALID_STATUSES = ['todo', 'in_progress', 'done'] as const;

type Priority = typeof VALID_PRIORITIES[number];
type Status = typeof VALID_STATUSES[number];

@Injectable()
export class TaskService extends BaseService<TaskDocument, TaskRepository> {
    constructor(protected readonly taskRepository: TaskRepository) {
        super(taskRepository);
    }

    /**
     * Get all tasks for a user with optional filters
     */
    async getTasks(
        userId: string,
        filters: TaskFilterDto
    ): Promise<TaskDocument[]> {
        try {
            const sanitizedFilters: { status?: string; priority?: string } = {};

            if (filters.status) {
                sanitizedFilters.status = this.validateEnum(filters.status, VALID_STATUSES, 'status');
            }

            if (filters.priority) {
                sanitizedFilters.priority = this.validateEnum(filters.priority, VALID_PRIORITIES, 'priority');
            }

            return await this.repository.findByUserId(userId, sanitizedFilters);
        } catch (error) {
            this.handleRepositoryError(error);
        }
    }

    /**
     * Create a new task
     */
    async createTask(
        userId: string,
        data: CreateTaskDto
    ): Promise<TaskDocument> {
        try {
            // Validate required fields
            this.validateRequired(data as any, [
                'encryptedData',
                'encapsulatedKey',
                'encryptedSymmetricKey',
                'recordHash'
            ]);

            // Validate and normalize priority
            const priority: Priority = data.priority
                ? this.validateEnum(data.priority, VALID_PRIORITIES, 'priority')
                : 'medium';

            // Validate and normalize status
            const status: Status = data.status
                ? this.validateEnum(data.status, VALID_STATUSES, 'status')
                : 'todo';

            // Get the next order for this status column
            const maxOrder = await this.repository.getMaxOrderInColumn(userId, status);
            const newOrder = maxOrder + 1;

            // Create the task
            const task = await this.repository.create({
                userId: userId as any,
                encryptedData: data.encryptedData,
                encapsulatedKey: data.encapsulatedKey,
                encryptedSymmetricKey: data.encryptedSymmetricKey,
                dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
                priority,
                status,
                order: newOrder,
                recordHash: data.recordHash,
                mentions: data.mentions || []
            });

            // Audit log
            this.logAction(userId, AuditAction.CREATE, AuditStatus.SUCCESS, {
                entityType: 'TASK',
                entityId: task._id.toString()
            });

            return task;
        } catch (error) {
            this.handleRepositoryError(error);
        }
    }

    /**
     * Update an existing task
     */
    async updateTask(
        userId: string,
        taskId: string,
        data: UpdateTaskDto
    ): Promise<TaskDocument> {
        try {
            const validatedId = this.validateId(taskId, 'task ID');

            // Build update object with validated fields
            const updateData: Partial<TaskDocument> = {};

            // Copy encrypted fields if provided
            if (data.encryptedData) updateData.encryptedData = data.encryptedData;
            if (data.encapsulatedKey) updateData.encapsulatedKey = data.encapsulatedKey;
            if (data.encryptedSymmetricKey) updateData.encryptedSymmetricKey = data.encryptedSymmetricKey;
            if (data.recordHash) updateData.recordHash = data.recordHash;

            // Validate and set priority if provided
            if (data.priority) {
                updateData.priority = this.validateEnum(data.priority, VALID_PRIORITIES, 'priority');
            }

            // Validate and set status if provided
            if (data.status) {
                updateData.status = this.validateEnum(data.status, VALID_STATUSES, 'status');
            }

            // Convert dueDate if provided
            if (data.dueDate) {
                updateData.dueDate = new Date(data.dueDate);
            }

            // Set order if provided
            if (data.order !== undefined) {
                updateData.order = data.order;
            }

            if (data.mentions) {
                updateData.mentions = data.mentions;
            }

            const task = await this.repository.updateByIdAndUser(
                validatedId,
                userId,
                updateData
            );

            if (!task) {
                throw new ServiceError('Task not found', 404, 'NOT_FOUND');
            }

            this.logAction(userId, AuditAction.UPDATE, AuditStatus.SUCCESS, {
                entityType: 'TASK',
                entityId: validatedId
            });

            return task;
        } catch (error) {
            this.handleRepositoryError(error);
        }
    }

    /**
     * Delete a task
     */
    async deleteTask(
        userId: string,
        taskId: string
    ): Promise<void> {
        try {
            const validatedId = this.validateId(taskId, 'task ID');

            const deleted = await this.repository.deleteByIdAndUser(validatedId, userId);

            if (!deleted) {
                throw new ServiceError('Task not found', 404, 'NOT_FOUND');
            }

            this.logAction(userId, AuditAction.DELETE, AuditStatus.SUCCESS, {
                entityType: 'TASK',
                entityId: validatedId
            });
        } catch (error) {
            this.handleRepositoryError(error);
        }
    }

    /**
     * Reorder tasks within or between columns
     */
    async reorderTasks(
        userId: string,
        updates: ReorderUpdateItemDto[]
    ): Promise<void> {
        try {
            if (!Array.isArray(updates)) {
                throw new ServiceError('Updates must be an array', 400, 'VALIDATION_ERROR');
            }

            // Validate all updates
            for (const update of updates) {
                if (!update.id || update.order === undefined) {
                    throw new ServiceError(
                        'Each update must have id and order',
                        400,
                        'VALIDATION_ERROR'
                    );
                }

                if (update.status) {
                    this.validateEnum(update.status, VALID_STATUSES, 'status');
                }
            }

            await this.repository.reorderBulk(userId, updates);

            this.logAction(userId, AuditAction.UPDATE, AuditStatus.SUCCESS, {
                entityType: 'TASK_BULK',
                action: 'REORDER',
                count: updates.length
            });
        } catch (error) {
            this.handleRepositoryError(error);
        }
    }

    /**
     * Get paginated tasks for a user
     */
    async getPaginatedTasks(
        userId: string,
        options: { limit: number; cursor?: string }
    ): Promise<{ items: TaskDocument[]; nextCursor: string | null }> {
        try {
            return await this.repository.findPaginated(
                { userId: { $eq: userId } as any },
                {
                    limit: Math.min(options.limit || 50, 100),
                    cursor: options.cursor,
                    sortField: '_id',
                    sortOrder: -1 // Most recent first
                }
            );
        } catch (error) {
            this.handleRepositoryError(error);
        }
    }

    /**
     * Get upcoming incomplete tasks for dashboard widget
     */
    async getUpcomingTasks(
        userId: string,
        limit: number = 10
    ): Promise<TaskDocument[]> {
        try {
            return await this.repository.findUpcoming(userId, limit);
        } catch (error) {
            this.handleRepositoryError(error);
        }
    }
}
