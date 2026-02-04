import { FastifyInstance } from 'fastify';
import { getEvents, createEvent, updateEvent, deleteEvent } from '../controllers/calendarController';

/**
 * Calendar Routes - Simple CRUD
 * High Priority - 4 endpoints total
 */

export default async function calendarRoutes(fastify: FastifyInstance) {
    const preHandler = [fastify.authenticate, fastify.csrfProtection];
    
    // All routes require authentication and CSRF protection
    fastify.get('/', { preHandler }, getEvents);
    fastify.post('/', { preHandler }, createEvent);
    fastify.put('/:id', { preHandler }, updateEvent);
    fastify.delete('/:id', { preHandler }, deleteEvent);
}
