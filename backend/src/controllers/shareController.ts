import { Request, Response } from 'express';
import { ShareService, ServiceError } from '../services';
import logger from '../utils/logger';

interface AuthRequest extends Request {
    user?: { id: string; username: string };
}

// Service instance
const shareService = new ShareService();

/**
 * Invite a user to a shared folder.
 */
export const invite = async (req: AuthRequest, res: Response) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: 'Not authenticated' });
        }
        const result = await shareService.inviteToFolder(req.user.id, req.body, req);
        res.status(201).json(result);
    } catch (error) {
        handleError(error, res);
    }
};

/**
 * Invite a user to a shared file.
 */
export const inviteFile = async (req: AuthRequest, res: Response) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: 'Not authenticated' });
        }
        const result = await shareService.inviteToFile(req.user.id, req.body, req);
        res.status(201).json(result);
    } catch (error) {
        handleError(error, res);
    }
};

/**
 * Get folders shared with the current user.
 */
export const getSharedWithMe = async (req: AuthRequest, res: Response) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: 'Not authenticated' });
        }
        const result = await shareService.getSharedWithMe(req.user.id);
        res.status(200).json(result);
    } catch (error) {
        handleError(error, res);
    }
};

/**
 * Get the encrypted shared key for a specific folder.
 */
export const getSharedFolderKey = async (req: AuthRequest, res: Response) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: 'Not authenticated' });
        }
        const result = await shareService.getSharedFolderKey(req.user.id, req.params.folderId as string);
        res.json(result);
    } catch (error) {
        handleError(error, res);
    }
};

/**
 * Get the encrypted shared key for a specific file.
 */
export const getSharedFileKey = async (req: AuthRequest, res: Response) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: 'Not authenticated' });
        }
        const result = await shareService.getSharedFileKey(req.user.id, req.params.fileId as string);
        res.json(result);
    } catch (error) {
        handleError(error, res);
    }
};

/**
 * Create a shared link for a file or folder.
 */
export const createLink = async (req: AuthRequest, res: Response) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: 'Not authenticated' });
        }
        const result = await shareService.createLink(req.user.id, req.body);
        res.status(201).json(result);
    } catch (error) {
        handleError(error, res);
    }
};

/**
 * Get all shared links created by the current user.
 */
export const getMyLinks = async (req: AuthRequest, res: Response) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: 'Not authenticated' });
        }
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 5;
        const result = await shareService.getMyLinks(req.user.id, page, limit);
        res.json(result);
    } catch (error) {
        handleError(error, res);
    }
};

/**
 * Revoke/Delete a shared link.
 */
export const revokeLink = async (req: AuthRequest, res: Response) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: 'Not authenticated' });
        }
        await shareService.revokeLink(req.user.id, req.params.id as string);
        res.json({ message: 'Link revoked successfully' });
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
    res.status(500).json({ message: 'Server error' });
}
