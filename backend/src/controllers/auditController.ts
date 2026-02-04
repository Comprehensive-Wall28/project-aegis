import { Request, Response } from 'express';
import { AuditService } from '../services';
import { withAuth } from '../middleware/controllerWrapper';

interface AuthRequest extends Request {
    user?: { id: string; username: string };
}

// Service instance
const auditService = new AuditService();

/**
 * Get audit logs for the authenticated user.
 * Supports pagination via limit and offset query parameters.
 */
export const getAuditLogs = withAuth(async (req: AuthRequest, res: Response) => {
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;

    const result = await auditService.getAuditLogs(req.user!.id, limit, offset);
    res.status(200).json(result);
});

/**
 * Get a summary of recent activity for the dashboard widget.
 */
export const getRecentActivity = withAuth(async (req: AuthRequest, res: Response) => {
    const result = await auditService.getRecentActivity(req.user!.id);
    res.status(200).json(result);
});
