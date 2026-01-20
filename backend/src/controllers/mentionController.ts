import { Request, Response } from 'express';
import { MentionService } from '../services/MentionService';
import { ServiceError } from '../services/base/BaseService';
import logger from '../utils/logger';

interface AuthRequest extends Request {
    user?: { id: string; username: string };
}

const mentionService = new MentionService();

/**
 * Get all backlinks for a specific entity.
 */
export const getBacklinks = async (req: AuthRequest, res: Response) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: 'Not authenticated' });
        }

        const { targetId } = req.query;
        if (!targetId || typeof targetId !== 'string') {
            return res.status(400).json({ message: 'Missing targetId query parameter' });
        }

        const backlinks = await mentionService.getBacklinks(req.user.id, targetId);
        res.status(200).json(backlinks);
    } catch (error) {
        handleError(error, res);
    }
};

/**
 * Handle service errors
 */
function handleError(error: unknown, res: Response): void {
    if (error instanceof ServiceError) {
        res.status(error.statusCode).json({ message: error.message });
        return;
    }

    logger.error('MentionController error:', error);
    res.status(500).json({ message: 'Server error' });
}
