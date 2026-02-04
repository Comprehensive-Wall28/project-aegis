import { FastifyInstance } from 'fastify';
import { getAuditLogs, getRecentActivity } from '../controllers/auditController';

export default async function auditRoutes(fastify: FastifyInstance) {
    // All audit routes require authentication and CSRF protection
    fastify.get('/', {
        preHandler: [fastify.authenticate, fastify.csrfProtection]
    }, getAuditLogs);
    
    fastify.get('/recent', {
        preHandler: [fastify.authenticate, fastify.csrfProtection]
    }, getRecentActivity);
}
