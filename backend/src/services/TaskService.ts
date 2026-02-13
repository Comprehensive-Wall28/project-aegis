import mongoose from 'mongoose';
import { Request } from 'express';
import { BaseService, ServiceError } from './base/BaseService';
import { TaskRepository } from '../repositories/TaskRepository';
import { ITask } from '../models/Task';
import { withCache, CacheInvalidator } from '../utils/cacheUtils';
import CacheKeyBuilder from './cache/CacheKeyBuilder';

/**
 * DTO for creating a task
 */
export interface CreateTaskDTO {
    encryptedData: string;
    encapsulatedKey: string;
    encryptedSymmetricKey: string;
    dueDate?: string | Date;
    priority?: string;
    status?: string;
    recordHash: string;
    mentions?: string[];
}

/**
 * DTO for updating a task
 */
export interface UpdateTaskDTO {
    encryptedData?: string;
    encapsulatedKey?: string;
    encryptedSymmetricKey?: string;
    dueDate?: string | Date;
    priority?: string;
    status?: string;
    recordHash?: string;
    order?: number;
    mentions?: string[];
}

/**
 * DTO for reordering tasks
 */
export interface ReorderDTO {
    id: string;
    status?: string;
    order: number;
}

const VALID_PRIORITIES = ['high', 'medium', 'low'] as const;
const VALID_STATUSES = ['todo', 'in_progress', 'done'] as const;

type Priority = typeof VALID_PRIORITIES[number];
type Status = typeof VALID_STATUSES[number];

/**
 * TaskService handles business logic for task operations
 */
export class TaskService extends BaseService<ITask, TaskRepository> {
    constructor() {
        super(new TaskRepository());
    }

    /**
     * Get all tasks for a user with optional filters (cached)
     */
    async getTasks(
        userId: string,
        filters?: { status?: string; priority?: string }
    ): Promise<ITask[]> {
        try {
            const sanitizedFilters: { status?: string; priority?: string } = {};

            if (filters?.status && typeof filters.status === 'string') {
                if (VALID_STATUSES.includes(filters.status as Status)) {
                    sanitizedFilters.status = filters.status;
                }
            }

            if (filters?.priority && typeof filters.priority === 'string') {
                if (VALID_PRIORITIES.includes(filters.priority as Priority)) {
                    sanitizedFilters.priority = filters.priority;
                }
            }

            const cacheKey = CacheKeyBuilder.taskList(userId, sanitizedFilters.status) +
                (sanitizedFilters.priority ? `:priority_${sanitizedFilters.priority}` : '');

            return await withCache(
                { key: cacheKey, ttl: 180000 }, // 3 minutes for tasks
                async () => {
                    return await this.repository.findByUserId(userId, sanitizedFilters);
                }
            );
        } catch (error) {
            this.handleRepositoryError(error);
        }
    }

    /**
     * Create a new task
     */
    async createTask(
        userId: string,
        data: CreateTaskDTO,
        req: Request
    ): Promise<ITask> {
        try {
            // Validate required fields
            this.validateRequired({
                encryptedData: data.encryptedData,
                encapsulatedKey: data.encapsulatedKey,
                encryptedSymmetricKey: data.encryptedSymmetricKey,
                recordHash: data.recordHash
            }, [
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
                userId: new mongoose.Types.ObjectId(userId),
                encryptedData: data.encryptedData,
                encapsulatedKey: data.encapsulatedKey,
                encryptedSymmetricKey: data.encryptedSymmetricKey,
                dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
                priority,
                status,
                order: newOrder,
                recordHash: data.recordHash,
                mentions: data.mentions || []
            } as Partial<ITask>);

            // Audit log
            await this.logAction(userId, 'TASK_CREATE', 'SUCCESS', req, {
                taskId: task._id.toString()
            });

            // Invalidate task caches for this user
            CacheInvalidator.userTasks(userId);

            return task;
        } catch (error) {
            if (error instanceof ServiceError) throw error;
            this.handleRepositoryError(error);
        }
    }

    /**
     * Update an existing task
     */
    async updateTask(
        userId: string,
        taskId: string,
        data: UpdateTaskDTO,
        req: Request
    ): Promise<ITask> {
        try {
            const validatedId = this.validateId(taskId, 'task ID');

            // Build update object with validated fields
            const updateData: Partial<ITask> = {};

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

            await this.logAction(userId, 'TASK_UPDATE', 'SUCCESS', req, {
                taskId: validatedId
            });

            // Invalidate task caches for this user
            CacheInvalidator.userTasks(userId);

            return task;
        } catch (error) {
            if (error instanceof ServiceError) throw error;
            this.handleRepositoryError(error);
        }
    }

    /**
     * Delete a task
     */
    async deleteTask(
        userId: string,
        taskId: string,
        req: Request
    ): Promise<void> {
        try {
            const validatedId = this.validateId(taskId, 'task ID');

            const deleted = await this.repository.deleteByIdAndUser(validatedId, userId);

            if (!deleted) {
                throw new ServiceError('Task not found', 404, 'NOT_FOUND');
            }

            await this.logAction(userId, 'TASK_DELETE', 'SUCCESS', req, {
                taskId: validatedId
            });

            // Invalidate task caches for this user
            CacheInvalidator.userTasks(userId);
        } catch (error) {
            if (error instanceof ServiceError) throw error;
            this.handleRepositoryError(error);
        }
    }

    /**
     * Reorder tasks within or between columns
     */
    async reorderTasks(
        userId: string,
        updates: ReorderDTO[],
        req: Request
    ): Promise<void> {
        try {
            if (!Array.isArray(updates)) {
                throw new ServiceError('Updates must be an array', 400, 'INVALID_INPUT');
            }

            // Validate all updates
            for (const update of updates) {
                if (!update.id || update.order === undefined) {
                    throw new ServiceError(
                        'Each update must have id and order',
                        400,
                        'INVALID_INPUT'
                    );
                }

                if (update.status && !VALID_STATUSES.includes(update.status as Status)) {
                    throw new ServiceError('Invalid status in updates', 400, 'INVALID_STATUS');
                }
            }

            await this.repository.reorderBulk(userId, updates);

            await this.logAction(userId, 'TASK_REORDER', 'SUCCESS', req, {
                count: updates.length
            });

            // Invalidate task caches for this user
            CacheInvalidator.userTasks(userId);
        } catch (error) {
            if (error instanceof ServiceError) throw error;
            this.handleRepositoryError(error);
        }
    }

    /**
     * Get paginated tasks for a user (cached)
     */
    async getPaginatedTasks(
        userId: string,
        options: { limit: number; cursor?: string; status?: string }
    ): Promise<{ items: ITask[]; nextCursor: string | null }> {
        try {
            const validStatuses = ['todo', 'in_progress', 'done'];
            const status = (typeof options.status === 'string' && validStatuses.includes(options.status))
                ? options.status
                : undefined;

            const cacheKey = CacheKeyBuilder.taskList(userId) +
                `:cursor_${options.cursor || 'first'}:limit_${Math.min(options.limit || 50, 100)}` +
                (status ? `:status_${status}` : '');

            return await withCache(
                { key: cacheKey, ttl: 180000 }, // 3 minutes for tasks
                async () => {
                    const filter: Record<string, unknown> = { userId: { $eq: userId } };
                    if (status) {
                        filter.status = { $eq: status };
                    }

                    return await this.repository.findPaginated(
                        filter as any,
                        {
                            limit: Math.min(options.limit || 50, 100),
                            cursor: options.cursor,
                            sortField: '_id',
                            sortOrder: -1 // Most recent first
                        }
                    );
                }
            );
        } catch (error) {
            this.handleRepositoryError(error);
        }
    }

    /**
     * Get upcoming incomplete tasks for dashboard widget (cached)
     */
    async getUpcomingTasks(
        userId: string,
        limit: number = 10
    ): Promise<ITask[]> {
        try {
            const cacheKey = CacheKeyBuilder.upcomingTasks(userId) + `:limit_${limit}`;

            return await withCache(
                { key: cacheKey, ttl: 60000 }, // 1 minute for upcoming (highly dynamic)
                async () => {
                    return await this.repository.findUpcoming(userId, limit);
                }
            );
        } catch (error) {
            this.handleRepositoryError(error);
        }
    }
}
