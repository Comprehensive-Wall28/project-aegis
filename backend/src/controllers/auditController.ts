import { Request, Response } from 'express';
import { AuditService, ServiceError } from '../services';
import logger from '../utils/logger';

interface AuthRequest extends Request {
    user?: { id: string; username: string };
}

// Service instance
const auditService = new AuditService();

/**
 * Get audit logs for the authenticated user.
 * Supports pagination via limit and offset query parameters.
 */
export const getAuditLogs = async (req: AuthRequest, res: Response) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: 'Not authenticated' });
        }

        const limit = parseInt(req.query.limit as string) || 50;
        const offset = parseInt(req.query.offset as string) || 0;

        const result = await auditService.getAuditLogs(req.user.id, limit, offset);
        res.status(200).json(result);
    } catch (error) {
        handleError(error, res);
    }
};

/**
 * Get a summary of recent activity for the dashboard widget.
 */
export const getRecentActivity = async (req: AuthRequest, res: Response) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: 'Not authenticated' });
        }

        const result = await auditService.getRecentActivity(req.user.id);
        res.status(200).json(result);
    } catch (error) {
        handleError(error, res);
    }
};

function handleError(error: unknown, res: Response): void {
    if (error instanceof ServiceError) {
        res.status(error.statusCode).json({ message: error.message });
        return;
    }
    logger.error('Controller error:', error);
    res.status(500).json({ message: 'Failed to fetch audit logs' });
}
