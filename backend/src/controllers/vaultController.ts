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

        // Create chunk data getter that collects from request stream
        const getChunkData = (): Promise<Buffer> => {
            return new Promise((resolve, reject) => {
                const chunks: Buffer[] = [];
                req.on('data', (chunk: Buffer) => chunks.push(chunk));
                req.on('end', () => resolve(Buffer.concat(chunks)));
                req.on('error', (err) => reject(err));
            });
        };

        const result = await vaultService.uploadChunk(
            req.user.id,
            fileId,
            contentRange,
            getChunkData
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
 * Get user files (optionally filtered by folder)
 */
export const getUserFiles = async (req: AuthRequest, res: Response) => {
    try {
        if (!req.user?.id) {
            return res.status(401).json({ message: 'User not authenticated' });
        }

        const folderId = req.query.folderId as string | undefined;
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
