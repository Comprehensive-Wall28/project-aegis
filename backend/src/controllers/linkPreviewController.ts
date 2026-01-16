import { Request, Response, NextFunction } from 'express';
import { LinkPreviewService } from '../services';
import { ServiceError } from '../services/base/BaseService';
import logger from '../utils/logger';

const linkPreviewService = new LinkPreviewService();

/**
 * Proxy an image to bypass CORS and mask user IP.
 */
export const proxyImage = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const url = req.query.url as string;

        const { stream, contentType } = await linkPreviewService.proxyImage(url);

        res.setHeader('Content-Type', contentType);
        // Cache for 24 hours
        res.setHeader('Cache-Control', 'public, max-age=86400');

        stream.pipe(res);
    } catch (error) {
        if (error instanceof ServiceError) {
            res.status(error.statusCode).json({ message: error.message });
            return;
        }
        logger.error(`Controller error:`, error);
        res.status(500).json({ message: 'Failed to fetch image' });
    }
};
