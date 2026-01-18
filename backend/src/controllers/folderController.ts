import { Request, Response } from 'express';
import { FolderService, ServiceError } from '../services';
import logger from '../utils/logger';

interface AuthRequest extends Request {
    user?: { id: string; username: string };
}

// Service instance
const folderService = new FolderService();

/**
 * Get all folders for the authenticated user in a specific parent folder.
 */
export const getFolders = async (req: AuthRequest, res: Response) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: 'Not authenticated' });
        }

        const { parentId: rawParentId } = req.query;

        // Normalize rawParentId
        let parentId: string | null = null;
        let candidate = rawParentId;
        if (Array.isArray(rawParentId)) {
            candidate = rawParentId[0];
        }
        if (candidate && candidate !== 'null' && typeof candidate === 'string') {
            parentId = candidate;
        }

        const folders = await folderService.getFolders(req.user.id, parentId);
        res.status(200).json(folders);
    } catch (error) {
        handleError(error, res);
    }
};

/**
 * Get a single folder by ID.
 */
export const getFolder = async (req: AuthRequest, res: Response) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: 'Not authenticated' });
        }

        const folder = await folderService.getFolder(req.user.id, req.params.id);
        res.status(200).json(folder);
    } catch (error) {
        handleError(error, res);
    }
};

/**
 * Create a new folder.
 */
export const createFolder = async (req: AuthRequest, res: Response) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: 'Not authenticated' });
        }

        const folder = await folderService.createFolder(req.user.id, req.body);
        res.status(201).json(folder);
    } catch (error) {
        handleError(error, res);
    }
};

/**
 * Update a folder (rename and/or change color).
 */
export const renameFolder = async (req: AuthRequest, res: Response) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: 'Not authenticated' });
        }

        const folder = await folderService.updateFolder(
            req.user.id,
            req.params.id,
            req.body
        );
        res.status(200).json(folder);
    } catch (error) {
        handleError(error, res);
    }
};

/**
 * Delete a folder (only if empty).
 */
export const deleteFolder = async (req: AuthRequest, res: Response) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: 'Not authenticated' });
        }

        await folderService.deleteFolder(req.user.id, req.params.id);
        res.status(200).json({ message: 'Folder deleted successfully' });
    } catch (error) {
        handleError(error, res);
    }
};

/**
 * Move files to a folder (supports bulk move).
 */
export const moveFiles = async (req: AuthRequest, res: Response) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: 'Not authenticated' });
        }

        const { updates, folderId } = req.body;
        const modifiedCount = await folderService.moveFiles(req.user.id, updates, folderId);

        res.status(200).json({
            message: `Moved ${modifiedCount} file(s)`,
            modifiedCount
        });
    } catch (error) {
        handleError(error, res);
    }
};

/**
 * Handle service errors and convert to HTTP responses
 */
function handleError(error: unknown, res: Response): void {
    if (error instanceof ServiceError) {
        res.status(error.statusCode).json({ message: error.message });
        return;
    }

    logger.error('Controller error:', error);
    res.status(500).json({ message: 'Server error' });
}
