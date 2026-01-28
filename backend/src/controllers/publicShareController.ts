import { Request, Response } from 'express';
import { PublicShareService } from '../services';
import logger from '../utils/logger';
import { catchAsync } from '../middleware/controllerWrapper';

// Service instance
const publicShareService = new PublicShareService();

/**
 * Get metadata for a shared link.
 * Access: Public
 */
export const getLinkMetadata = catchAsync(async (req: Request, res: Response) => {
    const { token } = req.params;
    const result = await publicShareService.getLinkMetadata(token as string);
    res.json(result);
});

/**
 * Download file via shared link.
 * Access: Public (if link is public)
 */
export const downloadSharedFile = catchAsync(async (req: Request, res: Response) => {
    const { token } = req.params;
    const { stream, mimeType, fileName, fileSize } = await publicShareService.downloadSharedFile(token as string);

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
});
