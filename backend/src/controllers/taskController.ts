import { Request, Response } from 'express';
import Task from '../models/Task';
import logger from '../utils/logger';
import { logAuditEvent } from '../utils/auditLogger';

interface AuthRequest extends Request {
    user?: { id: string; username: string };
}

/**
 * Get all tasks for the authenticated user.
 * Supports filtering by status and priority via query params.
 */
export const getTasks = async (req: AuthRequest, res: Response) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: 'Not authenticated' });
        }

        const { status, priority } = req.query;
        const query: any = { userId: { $eq: req.user.id } };

        // Apply optional filters
        if (status && typeof status === 'string') {
            const validStatuses = ['todo', 'in_progress', 'done'];
            if (validStatuses.includes(status)) {
                query.status = { $eq: status };
            }
        }

        if (priority && typeof priority === 'string') {
            const validPriorities = ['high', 'medium', 'low'];
            if (validPriorities.includes(priority)) {
                query.priority = { $eq: priority };
            }
        }

        const tasks = await Task.find(query).sort({ status: 1, order: 1, createdAt: -1 });
        res.status(200).json(tasks);
    } catch (error) {
        logger.error('Error fetching tasks:', error);
        res.status(500).json({ message: 'Server error' });
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

        const {
            encryptedData,
            encapsulatedKey,
            encryptedSymmetricKey,
            dueDate,
            priority,
            status,
            recordHash
        } = req.body;

        // Validate required encrypted fields
        if (!encryptedData || !encapsulatedKey || !encryptedSymmetricKey || !recordHash) {
            return res.status(400).json({
                message: 'Missing required fields: encryptedData, encapsulatedKey, encryptedSymmetricKey, recordHash'
            });
        }

        // Validate and normalize priority
        const validPriorities = ['high', 'medium', 'low'];
        const normalizedPriority = String(priority || 'medium');
        if (!validPriorities.includes(normalizedPriority)) {
            return res.status(400).json({ message: 'Invalid priority. Must be high, medium, or low' });
        }

        // Validate and normalize status
        const validStatuses = ['todo', 'in_progress', 'done'];
        const normalizedStatus = String(status || 'todo');
        if (!validStatuses.includes(normalizedStatus)) {
            return res.status(400).json({ message: 'Invalid status. Must be todo, in_progress, or done' });
        }

        // Get the highest order for the status column
        const maxOrderTask = await Task.findOne({
            userId: { $eq: req.user.id },
            status: { $eq: normalizedStatus }
        }).sort({ order: -1 });
        const newOrder = maxOrderTask ? maxOrderTask.order + 1 : 0;

        const task = await Task.create({
            userId: req.user.id,
            encryptedData,
            encapsulatedKey,
            encryptedSymmetricKey,
            dueDate: dueDate ? new Date(dueDate) : undefined,
            priority: normalizedPriority,
            status: normalizedStatus,
            order: newOrder,
            recordHash
        });

        logger.info(`Task created for user ${req.user.id}`);

        await logAuditEvent(
            req.user.id,
            'TASK_CREATE',
            'SUCCESS',
            req,
            { taskId: task._id.toString() }
        );

        res.status(201).json(task);
    } catch (error) {
        logger.error('Error creating task:', error);
        res.status(500).json({ message: 'Server error' });
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

        const { id } = req.params;
        const updateData = { ...req.body };

        // Prevent userId modification
        delete updateData.userId;

        // Validate priority if provided
        if (updateData.priority) {
            const validPriorities = ['high', 'medium', 'low'];
            const normalizedPriority = String(updateData.priority);
            if (!validPriorities.includes(normalizedPriority)) {
                return res.status(400).json({ message: 'Invalid priority' });
            }
            updateData.priority = normalizedPriority;
        }

        // Validate status if provided
        if (updateData.status) {
            const validStatuses = ['todo', 'in_progress', 'done'];
            const normalizedStatus = String(updateData.status);
            if (!validStatuses.includes(normalizedStatus)) {
                return res.status(400).json({ message: 'Invalid status' });
            }
            updateData.status = normalizedStatus;
        }

        // Convert dueDate if provided
        if (updateData.dueDate) {
            updateData.dueDate = new Date(updateData.dueDate);
        }

        const task = await Task.findOneAndUpdate(
            { _id: { $eq: id }, userId: { $eq: req.user.id } },
            { $set: updateData },
            { new: true }
        );

        if (!task) {
            return res.status(404).json({ message: 'Task not found' });
        }

        logger.info(`Task updated for user ${req.user.id}`);

        await logAuditEvent(
            req.user.id,
            'TASK_UPDATE',
            'SUCCESS',
            req,
            { taskId: id }
        );

        res.status(200).json(task);
    } catch (error) {
        logger.error('Error updating task:', error);
        res.status(500).json({ message: 'Server error' });
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

        const { id } = req.params;

        const task = await Task.findOneAndDelete({
            _id: { $eq: id },
            userId: { $eq: req.user.id }
        });

        if (!task) {
            return res.status(404).json({ message: 'Task not found' });
        }

        logger.info(`Task deleted for user ${req.user.id}`);

        await logAuditEvent(
            req.user.id,
            'TASK_DELETE',
            'SUCCESS',
            req,
            { taskId: id }
        );

        res.status(200).json({ message: 'Task deleted successfully' });
    } catch (error) {
        logger.error('Error deleting task:', error);
        res.status(500).json({ message: 'Server error' });
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

        const { updates } = req.body;

        if (!Array.isArray(updates)) {
            return res.status(400).json({ message: 'Updates must be an array' });
        }

        // Validate all updates
        const validStatuses = ['todo', 'in_progress', 'done'];
        for (const update of updates) {
            if (!update.id || update.order === undefined) {
                return res.status(400).json({ message: 'Each update must have id and order' });
            }
            if (update.status && !validStatuses.includes(String(update.status))) {
                return res.status(400).json({ message: 'Invalid status in updates' });
            }
        }

        // Perform bulk update
        const bulkOps = updates.map((update: { id: string; status?: string; order: number }) => ({
            updateOne: {
                filter: { _id: { $eq: update.id }, userId: { $eq: req.user!.id } },
                update: {
                    $set: {
                        order: update.order,
                        ...(update.status ? { status: update.status } : {})
                    }
                }
            }
        }));

        await Task.bulkWrite(bulkOps as any);

        logger.info(`Tasks reordered for user ${req.user.id}`);

        await logAuditEvent(
            req.user.id,
            'TASK_REORDER',
            'SUCCESS',
            req,
            { count: updates.length }
        );

        res.status(200).json({ message: 'Tasks reordered successfully' });
    } catch (error) {
        logger.error('Error reordering tasks:', error);
        res.status(500).json({ message: 'Server error' });
    }
};
