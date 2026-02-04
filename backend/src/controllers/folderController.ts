import { Request, Response } from 'express';
import { FolderService } from '../services';
import { withAuth } from '../middleware/controllerWrapper';

interface AuthRequest extends Request {
    user?: { id: string; username: string };
}

// Service instance
const folderService = new FolderService();

/**
 * Get all folders for the authenticated user in a specific parent folder.
 */
export const getFolders = withAuth(async (req: AuthRequest, res: Response) => {
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

    const folders = await folderService.getFolders(req.user!.id, parentId);
    res.status(200).json(folders);
});

/**
 * Get a single folder by ID.
 */
export const getFolder = withAuth(async (req: AuthRequest, res: Response) => {
    const folder = await folderService.getFolder(req.user!.id, req.params.id as string);
    res.status(200).json(folder);
});

/**
 * Create a new folder.
 */
export const createFolder = withAuth(async (req: AuthRequest, res: Response) => {
    const folder = await folderService.createFolder(req.user!.id, req.body);
    res.status(201).json(folder);
});

/**
 * Update a folder (rename and/or change color).
 */
export const renameFolder = withAuth(async (req: AuthRequest, res: Response) => {
    const folder = await folderService.updateFolder(
        req.user!.id,
        req.params.id as string,
        req.body
    );
    res.status(200).json(folder);
});

/**
 * Delete a folder (only if empty).
 */
export const deleteFolder = withAuth(async (req: AuthRequest, res: Response) => {
    await folderService.deleteFolder(req.user!.id, req.params.id as string);
    res.status(200).json({ message: 'Folder deleted successfully' });
});

/**
 * Move files to a folder (supports bulk move).
 */
export const moveFiles = withAuth(async (req: AuthRequest, res: Response) => {
    const { updates, folderId } = req.body;
    const modifiedCount = await folderService.moveFiles(req.user!.id, updates, folderId);

    res.status(200).json({
        message: `Moved ${modifiedCount} file(s)`,
        modifiedCount
    });
});
