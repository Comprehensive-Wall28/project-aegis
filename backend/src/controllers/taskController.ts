import { Request, Response } from 'express';
import { TaskService, ServiceError } from '../services';
import logger from '../utils/logger';
import { withAuth } from '../middleware/controllerWrapper';

interface AuthRequest extends Request {
    user?: { id: string; username: string };
}

// Service instance
const taskService = new TaskService();

/**
 * Get all tasks for the authenticated user.
 * Supports filtering by status and priority via query params.
 */
export const getTasks = withAuth(async (req: AuthRequest, res: Response) => {
    const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
    const cursor = req.query.cursor as string | undefined;

    if (limit !== undefined || cursor !== undefined) {
        const result = await taskService.getPaginatedTasks(req.user!.id, { limit: limit || 50, cursor });
        return res.status(200).json(result);
    }

    const tasks = await taskService.getTasks(req.user!.id, {
        status: req.query.status as string | undefined,
        priority: req.query.priority as string | undefined
    });

    res.status(200).json(tasks);
});

/**
 * Create a new encrypted task.
 */
export const createTask = withAuth(async (req: AuthRequest, res: Response) => {
    const task = await taskService.createTask(req.user!.id, req.body, req);
    res.status(201).json(task);
});

/**
 * Update an existing task.
 */
export const updateTask = withAuth(async (req: AuthRequest, res: Response) => {
    const task = await taskService.updateTask(
        req.user!.id,
        req.params.id as string,
        req.body,
        req
    );

    res.status(200).json(task);
});

/**
 * Delete a task.
 */
export const deleteTask = withAuth(async (req: AuthRequest, res: Response) => {
    await taskService.deleteTask(req.user!.id, req.params.id as string, req);
    res.status(200).json({ message: 'Task deleted successfully' });
});

/**
 * Reorder tasks within or between columns.
 * Expects an array of { id, status, order } objects.
 */
export const reorderTasks = withAuth(async (req: AuthRequest, res: Response) => {
    await taskService.reorderTasks(req.user!.id, req.body.updates, req);
    res.status(200).json({ message: 'Tasks reordered successfully' });
});

/**
 * Get upcoming incomplete tasks for dashboard widget.
 * Returns tasks with dueDate >= now, status != 'done', sorted by dueDate ASC.
 */
export const getUpcomingTasks = withAuth(async (req: AuthRequest, res: Response) => {
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
    const tasks = await taskService.getUpcomingTasks(req.user!.id, limit);
    res.status(200).json(tasks);
});
