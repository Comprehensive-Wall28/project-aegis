import { Request, Response } from 'express';
import { ShareService } from '../services';
import { withAuth } from '../middleware/controllerWrapper';

interface AuthRequest extends Request {
    user?: { id: string; username: string };
}

// Service instance
const shareService = new ShareService();



/**
 * Invite a user to a shared file.
 */
export const inviteFile = withAuth(async (req: AuthRequest, res: Response) => {
    const result = await shareService.inviteToFile(req.user!.id, req.body, req);
    res.status(201).json(result);
});

/**
 * Get the encrypted shared key for a specific file.
 */
export const getSharedFileKey = withAuth(async (req: AuthRequest, res: Response) => {
    const result = await shareService.getSharedFileKey(req.user!.id, req.params.fileId as string);
    res.json(result);
});

/**
 * Create a shared link for a file or folder.
 */
export const createLink = withAuth(async (req: AuthRequest, res: Response) => {
    const result = await shareService.createLink(req.user!.id, req.body);
    res.status(201).json(result);
});

/**
 * Get all shared links created by the current user.
 */
export const getMyLinks = withAuth(async (req: AuthRequest, res: Response) => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 5;
    const result = await shareService.getMyLinks(req.user!.id, page, limit);
    res.json(result);
});

/**
 * Revoke/Delete a shared link.
 */
export const revokeLink = withAuth(async (req: AuthRequest, res: Response) => {
    await shareService.revokeLink(req.user!.id, req.params.id as string);
    res.json({ message: 'Link revoked successfully' });
});
