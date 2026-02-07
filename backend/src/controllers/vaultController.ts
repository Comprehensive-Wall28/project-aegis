import { Request, Response } from 'express';
import { VaultService, ServiceError } from '../services';
import logger from '../utils/logger';
import { withAuth } from '../middleware/controllerWrapper';

interface AuthRequest extends Request {
    user?: { id: string; username: string };
}

// Service instance
const vaultService = new VaultService();

/**
 * Initialize a file upload session
 */
export const uploadInit = withAuth(async (req: AuthRequest, res: Response) => {
    const result = await vaultService.initUpload(req.user!.id, req.body, req);
    res.status(200).json({ fileId: result.fileId });
});

/**
 * Upload a file chunk
 */
export const uploadChunk = withAuth(async (req: AuthRequest, res: Response) => {
    const fileId = req.query.fileId as string;
    const contentRange = req.headers['content-range'] as string;
    const contentLength = parseInt(req.headers['content-length'] || '0', 10);

    if (contentLength === 0) {
        throw new ServiceError('Missing Content-Length', 400);
    }

    const result = await vaultService.uploadChunk(
        req.user!.id,
        fileId,
        contentRange,
        req, // Pass the request stream directly
        contentLength
    );

    if (result.complete) {
        // Fetch the full file metadata to return to the client
        const file = await vaultService.getFile(req.user!.id, fileId);

        res.status(200).json({
            message: 'Upload successful',
            googleDriveFileId: result.googleDriveFileId,
            file
        });
    } else {
        // Send 308 Resume Incomplete (following Google Drive convention)
        res.status(308).set('Range', `bytes=0-${result.receivedSize! - 1}`).send();
    }
});

/**
 * Download a file
 */
export const downloadFile = withAuth(async (req: AuthRequest, res: Response) => {
    const { stream, file } = await vaultService.getDownloadStream(
        req.user!.id,
        req.params.id as string
    );

    // Handle stream errors
    stream.on('error', (err) => {
        logger.error(`Google Drive stream error: ${err}`);
        if (!res.headersSent) {
            res.status(500).json({ message: 'Download failed' });
        }
    });

    res.setHeader('Content-Type', file.mimeType || 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${file.originalFileName}"`);
    res.setHeader('Content-Length', file.fileSize.toString());

    stream.pipe(res);
});

/**
 * Get a single file
 */
export const getFile = withAuth(async (req: AuthRequest, res: Response) => {
    const file = await vaultService.getFile(req.user!.id, req.params.id as string);
    res.json(file);
});

/**
 * Get user files (optionally filtered by folder, supports pagination)
 */
export const getUserFiles = withAuth(async (req: AuthRequest, res: Response) => {
    const folderId = req.query.folderId as string | undefined;
    const normalizedFolderId = folderId && folderId !== 'null' ? folderId : null;

    // Check for pagination params
    const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
    const cursor = req.query.cursor as string | undefined;
    const search = req.query.search as string | undefined;

    // Sort params
    const sortField = req.query.sortField as string | undefined;
    const sortOrder = req.query.sortOrder as 'asc' | 'desc' | undefined;

    if (limit !== undefined) {
        const result = await vaultService.getUserFilesPaginated(
            req.user!.id,
            normalizedFolderId,
            { limit, cursor, search, sort: sortField ? { field: sortField, order: sortOrder || 'desc' } : undefined }
        );
        return res.json(result);
    }

    // Non-paginated fallback
    const files = await vaultService.getUserFiles(req.user!.id, folderId, search);
    res.json(files);
});

/**
 * Delete a file
 */
export const deleteUserFile = withAuth(async (req: AuthRequest, res: Response) => {
    await vaultService.deleteFile(req.user!.id, req.params.id as string, req);
    res.status(200).json({ message: 'File deleted successfully' });
});

/**
 * Get user storage stats
 */
export const getStorageStats = withAuth(async (req: AuthRequest, res: Response) => {
    const stats = await vaultService.getStorageStats(req.user!.id);
    res.json(stats);
});
