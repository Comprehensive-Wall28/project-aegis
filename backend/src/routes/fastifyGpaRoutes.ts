import { FastifyInstance } from 'fastify';
import {
    getCourses,
    createCourse,
    deleteCourse,
    updatePreferences,
    getPreferences,
    getUnmigratedCourses,
    migrateCourse
} from '../controllers/fastifyGpaController';
import { authenticateUser } from '../middleware/fastifyAuthMiddleware';
import { csrfProtection } from '../middleware/fastifyCsrf';

export async function gpaRoutes(app: FastifyInstance) {
    const authCsrf = [authenticateUser, csrfProtection];

    app.get('/courses', { preHandler: authCsrf, handler: getCourses });
    app.post('/courses', { preHandler: authCsrf, handler: createCourse });
    app.delete('/courses/:id', { preHandler: authCsrf, handler: deleteCourse });
    app.put('/preferences', { preHandler: authCsrf, handler: updatePreferences });
    app.get('/preferences', { preHandler: authCsrf, handler: getPreferences });
    app.get('/courses/unmigrated', { preHandler: authCsrf, handler: getUnmigratedCourses });
    app.post('/courses/:id/migrate', { preHandler: authCsrf, handler: migrateCourse });
}
