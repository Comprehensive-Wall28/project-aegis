import { Request, Response } from 'express';
import { VaultService, ServiceError } from '../services';
import logger from '../utils/logger';

interface AuthRequest extends Request {
    user?: { id: string; username: string };
}

// Service instance
const vaultService = new VaultService();

/**
 * Initialize a file upload session
 */
export const uploadInit = async (req: AuthRequest, res: Response) => {
    try {
        if (!req.user?.id) {
            return res.status(401).json({ message: 'User not authenticated' });
        }

        const result = await vaultService.initUpload(req.user.id, req.body, req);
        res.status(200).json({ fileId: result.fileId });
    } catch (error) {
        handleError(error, res);
    }
};

/**
 * Upload a file chunk
 */
export const uploadChunk = async (req: AuthRequest, res: Response) => {
    try {
        if (!req.user?.id) {
            return res.status(401).json({ message: 'User not authenticated' });
        }

        const fileId = req.query.fileId as string;
        const contentRange = req.headers['content-range'] as string;
        const contentLength = parseInt(req.headers['content-length'] || '0', 10);

        if (contentLength === 0) {
            throw new ServiceError('Missing Content-Length', 400);
        }

        const result = await vaultService.uploadChunk(
            req.user.id,
            fileId,
            contentRange,
            req, // Pass the request stream directly
            contentLength
        );

        if (result.complete) {
            res.status(200).json({
                message: 'Upload successful',
                googleDriveFileId: result.googleDriveFileId
            });
        } else {
            // Send 308 Resume Incomplete (following Google Drive convention)
            res.status(308).set('Range', `bytes=0-${result.receivedSize! - 1}`).send();
        }
    } catch (error) {
        handleError(error, res);
    }
};

/**
 * Download a file
 */
export const downloadFile = async (req: AuthRequest, res: Response) => {
    try {
        if (!req.user?.id) {
            return res.status(401).json({ message: 'User not authenticated' });
        }

        const { stream, file } = await vaultService.getDownloadStream(
            req.user.id,
            req.params.id
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
    } catch (error) {
        handleError(error, res);
    }
};

/**
 * Get a single file
 */
export const getFile = async (req: AuthRequest, res: Response) => {
    try {
        if (!req.user?.id) {
            return res.status(401).json({ message: 'User not authenticated' });
        }

        const file = await vaultService.getFile(req.user.id, req.params.id);
        res.json(file);
    } catch (error) {
        handleError(error, res);
    }
};

/**
 * Get user files (optionally filtered by folder, supports pagination)
 */
export const getUserFiles = async (req: AuthRequest, res: Response) => {
    try {
        if (!req.user?.id) {
            return res.status(401).json({ message: 'User not authenticated' });
        }

        const folderId = req.query.folderId as string | undefined;
        const normalizedFolderId = folderId && folderId !== 'null' ? folderId : null;

        // Check for pagination params
        const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
        const cursor = req.query.cursor as string | undefined;

        if (limit !== undefined) {
            const result = await vaultService.getUserFilesPaginated(
                req.user.id,
                normalizedFolderId,
                { limit, cursor }
            );
            return res.json(result);
        }

        // Non-paginated fallback
        const files = await vaultService.getUserFiles(req.user.id, folderId);
        res.json(files);
    } catch (error) {
        handleError(error, res);
    }
};

/**
 * Delete a file
 */
export const deleteUserFile = async (req: AuthRequest, res: Response) => {
    try {
        if (!req.user?.id) {
            return res.status(401).json({ message: 'User not authenticated' });
        }

        await vaultService.deleteFile(req.user.id, req.params.id, req);
        res.status(200).json({ message: 'File deleted successfully' });
    } catch (error) {
        handleError(error, res);
    }
};

/**
 * Get user storage stats
 */
export const getStorageStats = async (req: AuthRequest, res: Response) => {
    try {
        if (!req.user?.id) {
            return res.status(401).json({ message: 'User not authenticated' });
        }

        const stats = await vaultService.getStorageStats(req.user.id);
        res.json(stats);
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
