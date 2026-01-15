import { Request, Response, NextFunction } from 'express';
import axios from 'axios';
import logger from '../utils/logger';

/**
 * Proxy an image to bypass CORS and mask user IP.
 */
export const proxyImage = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { url } = req.query;

        if (!url || typeof url !== 'string') {
            return res.status(400).json({ message: 'URL is required' });
        }

        // Validate URL
        try {
            new URL(url);
        } catch (e) {
            return res.status(400).json({ message: 'Invalid URL' });
        }

        const response = await axios({
            method: 'get',
            url: url,
            responseType: 'stream',
            timeout: 10000,
            maxRedirects: 5,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.9',
                'Referer': new URL(url).origin + '/',
                'Cache-Control': 'no-cache',
                'Pragma': 'no-cache'
            },
            validateStatus: (status) => status < 400 // Only proceed if not an error
        });

        // Set content type from response
        const contentType = response.headers['content-type'];
        if (contentType && contentType.startsWith('image/')) {
            res.setHeader('Content-Type', contentType);
        } else {
            res.setHeader('Content-Type', 'image/png'); // Fallback
        }

        // Cache for 24 hours
        res.setHeader('Cache-Control', 'public, max-age=86400');

        response.data.pipe(res);
    } catch (error: any) {
        logger.warn(`Failed to proxy image: ${req.query.url}`, error.message);
        res.status(500).json({ message: 'Failed to fetch image' });
    }
};
