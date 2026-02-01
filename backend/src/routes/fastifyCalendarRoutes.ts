import { FastifyInstance } from 'fastify';
import {
    getEvents,
    createEvent,
    updateEvent,
    deleteEvent
} from '../controllers/fastifyCalendarController';
import { authenticateUser } from '../middleware/fastifyAuthMiddleware';
import { csrfProtection } from '../middleware/fastifyCsrf';

export async function calendarRoutes(app: FastifyInstance) {
    const authCsrf = [authenticateUser, csrfProtection];

    app.get('/', { preHandler: authCsrf, handler: getEvents });
    app.post('/', { preHandler: authCsrf, handler: createEvent });
    app.put('/:id', { preHandler: authCsrf, handler: updateEvent });
    app.delete('/:id', { preHandler: authCsrf, handler: deleteEvent });
}
