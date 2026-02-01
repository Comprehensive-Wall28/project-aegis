import { FastifyInstance } from 'fastify';
import {
    getTasks,
    createTask,
    updateTask,
    deleteTask,
    reorderTasks,
    getUpcomingTasks
} from '../controllers/fastifyTaskController';
import { authenticateUser } from '../middleware/fastifyAuthMiddleware';
import { csrfProtection } from '../middleware/fastifyCsrf';

export async function taskRoutes(app: FastifyInstance) {
    const authCsrf = [authenticateUser, csrfProtection];

    app.get('/', { preHandler: authCsrf, handler: getTasks });
    app.get('/upcoming', { preHandler: authCsrf, handler: getUpcomingTasks });
    app.post('/', { preHandler: authCsrf, handler: createTask });
    app.put('/:id', { preHandler: authCsrf, handler: updateTask });
    app.delete('/:id', { preHandler: authCsrf, handler: deleteTask });
    app.post('/reorder', { preHandler: authCsrf, handler: reorderTasks });
}
