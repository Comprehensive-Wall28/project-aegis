import { Request, Response } from 'express';
import AuditLog from '../models/AuditLog';
import logger from '../utils/logger';

interface AuthRequest extends Request {
    user?: { id: string; username: string };
}

/**
 * Get audit logs for the authenticated user.
 * Supports pagination via limit and offset query parameters.
 * 
 * GET /api/audit-logs?limit=50&offset=0
 */
export const getAuditLogs = async (req: AuthRequest, res: Response) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: 'Not authenticated' });
        }

        // Parse pagination parameters with sensible defaults
        const limit = Math.min(Math.max(parseInt(req.query.limit as string) || 50, 1), 100);
        const offset = Math.max(parseInt(req.query.offset as string) || 0, 0);

        // Fetch logs for the user, sorted by most recent first
        const [logs, total] = await Promise.all([
            AuditLog.find({ userId: req.user.id })
                .sort({ timestamp: -1 })
                .skip(offset)
                .limit(limit)
                .lean(),
            AuditLog.countDocuments({ userId: req.user.id })
        ]);

        const hasMore = offset + logs.length < total;

        logger.info(`Fetched ${logs.length} audit logs for user ${req.user.id}`);

        res.status(200).json({
            logs,
            total,
            hasMore,
            limit,
            offset
        });

    } catch (error) {
        logger.error(`Error fetching audit logs: ${error}`);
        res.status(500).json({ message: 'Failed to fetch audit logs' });
    }
};

/**
 * Get a summary of recent activity for the dashboard widget.
 * Returns the 3 most recent audit log entries.
 * 
 * GET /api/audit-logs/recent
 */
export const getRecentActivity = async (req: AuthRequest, res: Response) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: 'Not authenticated' });
        }

        const logs = await AuditLog.find({ userId: req.user.id })
            .sort({ timestamp: -1 })
            .limit(3)
            .lean();

        res.status(200).json({ logs });

    } catch (error) {
        logger.error(`Error fetching recent activity: ${error}`);
        res.status(500).json({ message: 'Failed to fetch recent activity' });
    }
};
