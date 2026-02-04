import { FastifyRequest, FastifyReply } from 'fastify';
import { TaskService } from '../services';

// Service instance
const taskService = new TaskService();

/**
 * Get all tasks for the authenticated user.
 * Supports filtering by status and priority via query params.
 */
export const getTasks = async (request: FastifyRequest, reply: FastifyReply) => {
    const query = request.query as Record<string, string>;
    const limit = query.limit ? parseInt(query.limit) : undefined;
    const cursor = query.cursor;
    const user = request.user as any;
    const userId = user?.id || user?._id;

    if (limit !== undefined || cursor !== undefined) {
        const result = await taskService.getPaginatedTasks(userId, { limit: limit || 50, cursor });
        return reply.code(200).send(result);
    }

    const tasks = await taskService.getTasks(userId, {
        status: query.status,
        priority: query.priority
    });

    reply.code(200).send(tasks);
};

/**
 * Create a new encrypted task.
 */
export const createTask = async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user as any;
    const userId = user?.id || user?._id;
    const task = await taskService.createTask(userId, request.body as any, request as any);
    reply.code(201).send(task);
};

/**
 * Update an existing task.
 */
export const updateTask = async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user as any;
    const userId = user?.id || user?._id;
    const params = request.params as any;
    const task = await taskService.updateTask(
        userId,
        params.id,
        request.body as any,
        request as any
    );

    reply.code(200).send(task);
};

/**
 * Delete a task.
 */
export const deleteTask = async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user as any;
    const userId = user?.id || user?._id;
    const params = request.params as any;
    await taskService.deleteTask(userId, params.id, request as any);
    reply.code(200).send({ message: 'Task deleted successfully' });
};

/**
 * Reorder tasks within or between columns.
 * Expects an array of { id, status, order } objects.
 */
export const reorderTasks = async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user as any;
    const userId = user?.id || user?._id;
    const body = request.body as any;
    await taskService.reorderTasks(userId, body.updates, request as any);
    reply.code(200).send({ message: 'Tasks reordered successfully' });
};

/**
 * Get upcoming incomplete tasks for dashboard widget.
 * Returns tasks with dueDate >= now, status != 'done', sorted by dueDate ASC.
 */
export const getUpcomingTasks = async (request: FastifyRequest, reply: FastifyReply) => {
    const query = request.query as Record<string, string>;
    const limit = query.limit ? parseInt(query.limit) : 10;
    const user = request.user as any;
    const userId = user?.id || user?._id;
    const tasks = await taskService.getUpcomingTasks(userId, limit);
    reply.code(200).send(tasks);
};
