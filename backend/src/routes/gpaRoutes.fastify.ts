import { FastifyInstance } from 'fastify';
import {
    getCourses,
    createCourse,
    deleteCourse,
    getPreferences,
    updatePreferences,
    getUnmigratedCourses,
    migrateCourse
} from '../controllers/gpaController';

/**
 * GPA Routes - Simple CRUD with encrypted data
 * High Priority - 7 endpoints total
 */

export default async function gpaRoutes(fastify: FastifyInstance) {
    const preHandler = [fastify.authenticate, fastify.csrfProtection];
    
    // All routes require authentication and CSRF protection
    // Migration endpoints (must be before /:id routes to avoid conflicts)
    fastify.get('/courses/unmigrated', { preHandler }, getUnmigratedCourses);
    fastify.put('/courses/:id/migrate', { preHandler }, migrateCourse);
    
    // Course CRUD (encrypted data only)
    fastify.get('/courses', { preHandler }, getCourses);
    fastify.post('/courses', { preHandler }, createCourse);
    fastify.delete('/courses/:id', { preHandler }, deleteCourse);
    
    // User Preferences
    fastify.get('/preferences', { preHandler }, getPreferences);
    fastify.put('/preferences', { preHandler }, updatePreferences);
}
