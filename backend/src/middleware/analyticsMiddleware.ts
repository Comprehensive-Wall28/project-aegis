import { Request, Response, NextFunction } from 'express';
import { analyticsBuffer } from '../utils/analyticsBuffer';

/**
 * Analytics middleware - captures performance metrics for all requests
 * Zero performance impact - uses fire-and-forget pattern
 * Captures: method, path, status, duration, userId, IP, userAgent
 */
export const analyticsMiddleware = (req: Request, res: Response, next: NextFunction): void => {
    const startTime = process.hrtime.bigint();
    
    // Store start time on request for potential later use
    (req as any)._analyticsStartTime = startTime;

    // Capture response finish event
    res.on('finish', () => {
        const endTime = process.hrtime.bigint();
        const durationMs = Number(endTime - startTime) / 1000000; // Convert nanoseconds to milliseconds

        // Extract user ID if authenticated
        const userId = (req as any).user?._id?.toString();

        // Build metadata
        const metadata: Record<string, any> = {};
        
        // Capture query params (excluding sensitive data)
        if (req.query && Object.keys(req.query).length > 0) {
            const safeQuery = { ...req.query };
            // Remove potentially sensitive fields
            delete safeQuery.password;
            delete safeQuery.token;
            delete safeQuery.secret;
            delete safeQuery.key;
            if (Object.keys(safeQuery).length > 0) {
                metadata.query = safeQuery;
            }
        }

        // Capture response size if available
        const contentLength = res.get('Content-Length');
        if (contentLength) {
            metadata.contentLength = parseInt(contentLength, 10);
        }

        // Capture error message for failed requests
        if (res.statusCode >= 400 && (req as any)._errorMessage) {
            metadata.errorMessage = (req as any)._errorMessage;
        }

        // Queue metric (fire and forget - never await)
        analyticsBuffer.queueMetric({
            method: req.method,
            path: req.route?.path || req.path,
            statusCode: res.statusCode,
            durationMs,
            userId,
            ipAddress: req.ip || req.socket.remoteAddress || 'unknown',
            userAgent: req.get('user-agent') || undefined,
            timestamp: new Date(),
            metadata: Object.keys(metadata).length > 0 ? metadata : undefined,
        });
    });

    next();
};

/**
 * Helper to attach error messages to request for analytics
 */
export const attachErrorMessage = (req: Request, message: string): void => {
    (req as any)._errorMessage = message;
};
