import axios from 'axios';
import { Readable } from 'stream';
import { ServiceError } from './base/BaseService';
import logger from '../utils/logger';

export interface ProxyImageResponse {
    stream: Readable;
    contentType: string;
}

/**
 * LinkPreviewService handles proxying images for previews
 */
export class LinkPreviewService {
    /**
     * Proxy an image URL to bypass CORS and mask user IP
     */
    async proxyImage(url: string): Promise<ProxyImageResponse> {
        try {
            if (!url) {
                throw new ServiceError('URL is required', 400);
            }

            // Validate URL
            try {
                new URL(url);
            } catch (e) {
                throw new ServiceError('Invalid URL', 400);
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
                validateStatus: (status) => status < 400
            });

            const contentType = response.headers['content-type'];
            const finalContentType = (contentType && contentType.startsWith('image/'))
                ? contentType
                : 'image/png';

            return {
                stream: response.data,
                contentType: finalContentType
            };

        } catch (error: any) {
            if (error instanceof ServiceError) throw error;
            logger.warn(`Failed to proxy image: ${url}`, error.message);
            throw new ServiceError('Failed to fetch image', 500);
        }
    }
}
