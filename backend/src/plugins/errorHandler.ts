import { FastifyInstance, FastifyRequest, FastifyReply, FastifyError } from 'fastify';
import { config } from '../config/env';
import AuditLog from '../models/AuditLog';

/**
 * Error Handler Plugin
 * MITIGATION: Maintains exact error response format and audit logging behavior
 */
export async function errorHandlerPlugin(fastify: FastifyInstance) {
    fastify.setErrorHandler(async (error: FastifyError, request: FastifyRequest, reply: FastifyReply) => {
        // Determine status code
        let statusCode = error.statusCode || reply.statusCode || 500;

        // Check for specific error codes
        if (error.code === 'EBADCSRFTOKEN') statusCode = 403;
        if (error.validation) statusCode = 400;

        // Log server errors (500+) to audit logs for analytics visibility
        // MITIGATION: Maintains audit logging for monitoring critical errors
        if (statusCode >= 500) {
            try {
                const user = request.user as any;
            const userId = user?._id || user?.id;
                await AuditLog.create({
                    userId: userId || undefined,
                    action: 'API_ERROR',
                    status: 'FAILURE',
                    ipAddress: request.ip || request.socket.remoteAddress || 'unknown',
                    metadata: {
                        path: request.url,
                        method: request.method,
                        statusCode: statusCode,
                        errorMessage: error.message,
                        errorStack: config.nodeEnv === 'production' ? undefined : error.stack,
                    },
                });
            } catch (auditError) {
                // Don't let audit logging failure break the error response
                console.error('Failed to log API error to audit:', auditError);
            }
        }

        // Send error response matching Express format
        reply.code(statusCode).send({
            message: error.message,
            stack: config.nodeEnv === 'production' ? null : error.stack,
        });
    });
}
