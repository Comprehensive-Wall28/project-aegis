import { Request, Response } from 'express';
import { TaskService, ServiceError } from '../services';
import logger from '../utils/logger';

interface AuthRequest extends Request {
    user?: { id: string; username: string };
}

// Service instance
const taskService = new TaskService();

/**
 * Get all tasks for the authenticated user.
 * Supports filtering by status and priority via query params.
 */
export const getTasks = async (req: AuthRequest, res: Response) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: 'Not authenticated' });
        }

        const tasks = await taskService.getTasks(req.user.id, {
            status: req.query.status as string | undefined,
            priority: req.query.priority as string | undefined
        });

        res.status(200).json(tasks);
    } catch (error) {
        handleError(error, res);
    }
};

/**
 * Create a new encrypted task.
 */
export const createTask = async (req: AuthRequest, res: Response) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: 'Not authenticated' });
        }

        const task = await taskService.createTask(req.user.id, req.body, req);
        res.status(201).json(task);
    } catch (error) {
        handleError(error, res);
    }
};

/**
 * Update an existing task.
 */
export const updateTask = async (req: AuthRequest, res: Response) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: 'Not authenticated' });
        }

        const task = await taskService.updateTask(
            req.user.id,
            req.params.id,
            req.body,
            req
        );

        res.status(200).json(task);
    } catch (error) {
        handleError(error, res);
    }
};

/**
 * Delete a task.
 */
export const deleteTask = async (req: AuthRequest, res: Response) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: 'Not authenticated' });
        }

        await taskService.deleteTask(req.user.id, req.params.id, req);
        res.status(200).json({ message: 'Task deleted successfully' });
    } catch (error) {
        handleError(error, res);
    }
};

/**
 * Reorder tasks within or between columns.
 * Expects an array of { id, status, order } objects.
 */
export const reorderTasks = async (req: AuthRequest, res: Response) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: 'Not authenticated' });
        }

        await taskService.reorderTasks(req.user.id, req.body.updates, req);
        res.status(200).json({ message: 'Tasks reordered successfully' });
    } catch (error) {
        handleError(error, res);
    }
};

/**
 * Handle service errors and convert to HTTP responses
 */
function handleError(error: unknown, res: Response): void {
    if (error instanceof ServiceError) {
        res.status(error.statusCode).json({ message: error.message });
        return;
    }

    logger.error('Controller error:', error);
    res.status(500).json({ message: 'Server error' });
}
