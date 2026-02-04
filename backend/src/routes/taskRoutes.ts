import { FastifyInstance } from 'fastify';
import {
    getTasks,
    createTask,
    updateTask,
    deleteTask,
    reorderTasks,
    getUpcomingTasks
} from '../controllers/taskController';

export default async function taskRoutes(fastify: FastifyInstance) {
    // All routes require authentication and CSRF protection
    const preHandler = [fastify.authenticate, fastify.csrfProtection];

    // Task CRUD
    fastify.get('/', { preHandler }, getTasks);
    fastify.get('/upcoming', { preHandler }, getUpcomingTasks);  // Lightweight endpoint for dashboard widget
    fastify.post('/', { preHandler }, createTask);
    fastify.put('/reorder', { preHandler }, reorderTasks);  // Must come before /:id to avoid route conflict
    fastify.put('/:id', { preHandler }, updateTask);
    fastify.delete('/:id', { preHandler }, deleteTask);
}

