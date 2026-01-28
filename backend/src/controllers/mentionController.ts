import { Request, Response } from 'express';
import { MentionService } from '../services/MentionService';
import logger from '../utils/logger';
import { withAuth } from '../middleware/controllerWrapper';

interface AuthRequest extends Request {
    user?: { id: string; username: string };
}

const mentionService = new MentionService();

/**
 * Get all backlinks for a specific entity.
 */
export const getBacklinks = withAuth(async (req: AuthRequest, res: Response) => {
    const { targetId } = req.query;
    if (!targetId || typeof targetId !== 'string') {
        return res.status(400).json({ message: 'Missing targetId query parameter' });
    }

    const backlinks = await mentionService.getBacklinks(req.user!.id, targetId);
    res.status(200).json(backlinks);
});
