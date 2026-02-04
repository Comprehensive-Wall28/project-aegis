import { Request, Response, NextFunction } from 'express';
import { config } from '../config/env';
import AuditLog from '../models/AuditLog';

export const errorHandler = async (err: any, req: Request, res: Response, _next: NextFunction) => {
    // If the response status is still 200, it means it wasn't set by the controller/middleware.
    // We should use the error's status code if available, otherwise default to 500.
    let statusCode = res.statusCode === 200 ? 500 : res.statusCode;

    // Check for specific error status codes
    if (err.status) statusCode = err.status;
    if (err.statusCode) statusCode = err.statusCode;
    if (err.code === 'EBADCSRFTOKEN') statusCode = 403;

    // Log server errors (500+) to audit logs for analytics visibility
    if (statusCode >= 500) {
        try {
            const userId = (req as any).user?._id;
            await AuditLog.create({
                userId: userId || undefined,
                action: 'API_ERROR',
                status: 'FAILURE',
                ipAddress: req.ip || req.socket.remoteAddress || 'unknown',
                metadata: {
                    path: req.path,
                    method: req.method,
                    statusCode: statusCode,
                    errorMessage: err.message,
                    errorStack: config.nodeEnv === 'production' ? undefined : err.stack,
                },
            });
        } catch (auditError) {
            // Don't let audit logging failure break the error response
            console.error('Failed to log API error to audit:', auditError);
        }
    }

    res.status(statusCode);

    res.json({
        message: err.message,
        stack: config.nodeEnv === 'production' ? null : err.stack,
    });
};
