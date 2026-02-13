import { Request, Response, NextFunction } from 'express';
import AuditLog from '../models/AuditLog';
import logger from '../utils/logger';

export const errorHandler = (err: any, req: Request, res: Response, _next: NextFunction) => {
    // If the response status is still 200, it means it wasn't set by the controller/middleware.
    // We should use the error's status code if available, otherwise default to 500.
    let statusCode = res.statusCode === 200 ? 500 : res.statusCode;

    // Check for specific error status codes
    if (err.status) statusCode = err.status;
    if (err.statusCode) statusCode = err.statusCode;
    if (err.code === 'EBADCSRFTOKEN') statusCode = 403;

    // Log full error details internally for debugging
    // Include stack trace in all environments for comprehensive logging
    logger.error('API Error:', {
        statusCode,
        path: req.path,
        method: req.method,
        errorMessage: err.message,
        errorStack: err.stack,
        userId: (req as any).user?._id,
        ipAddress: req.ip || req.socket?.remoteAddress,
    });

    // Log server errors (500+) to audit logs using fire-and-forget pattern
    // This prevents synchronous DB writes from blocking error responses
    if (statusCode >= 500) {
        const userId = (req as any).user?._id;

        // Fire-and-forget: don't await the audit log creation
        // This ensures the error response is sent immediately without DB latency
        AuditLog.create({
            userId: userId || undefined,
            action: 'API_ERROR',
            status: 'FAILURE',
            ipAddress: req.ip || req.socket.remoteAddress || 'unknown',
            metadata: {
                path: req.path,
                method: req.method,
                statusCode: statusCode,
                errorMessage: err.message,
                // Always include stack trace in audit logs for debugging
                errorStack: err.stack,
            },
        }).catch((auditError) => {
            // Log error but don't throw - audit logging failure shouldn't break error response
            logger.error('Failed to log API error to audit:', auditError);
        });
    }

    res.status(statusCode);

    // Return generic messages to prevent information leakage
    // Never expose internal error details or stack traces to clients
    const isServerError = statusCode >= 500;
    const responseMessage = isServerError
        ? 'Internal server error'
        : (err.message || 'Request failed');

    res.json({
        message: responseMessage,
        // Never expose stack traces in API responses
        stack: undefined,
    });
};
