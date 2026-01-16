import { Request, Response } from 'express';
import { PublicShareService, ServiceError } from '../services';
import logger from '../utils/logger';

// Service instance
const publicShareService = new PublicShareService();

/**
 * Get metadata for a shared link.
 * Access: Public
 */
export const getLinkMetadata = async (req: Request, res: Response) => {
    try {
        const { token } = req.params;
        const result = await publicShareService.getLinkMetadata(token);
        res.json(result);
    } catch (error) {
        handleError(error, res);
    }
};

/**
 * Download file via shared link.
 * Access: Public (if link is public)
 */
export const downloadSharedFile = async (req: Request, res: Response) => {
    try {
        const { token } = req.params;
        const { stream, mimeType, fileName, fileSize } = await publicShareService.downloadSharedFile(token);

        res.setHeader('Content-Type', mimeType);
        res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
        res.setHeader('Content-Length', fileSize.toString());

        stream.on('error', (err) => {
            logger.error(`Stream error: ${err}`);
            if (!res.headersSent) {
                res.status(500).json({ message: 'Download failed' });
            }
        });

        stream.pipe(res);
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
