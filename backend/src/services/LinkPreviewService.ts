import axios from 'axios';
import { Readable } from 'stream';
import dns from 'dns';
import net from 'net';
import http from 'http';
import https from 'https';
import { ServiceError } from './base/BaseService';
import logger from '../utils/logger';

export interface ProxyImageResponse {
    stream: Readable;
    contentType: string;
}

/**
 * Checks if an IP address is private/internal
 */
function isPrivateIp(ip: string): boolean {
    if (!net.isIP(ip)) return false;

    // IPv4 checks
    if (net.isIPv4(ip)) {
        const parts = ip.split('.').map(Number);
        // 127.0.0.0/8 (Loopback)
        if (parts[0] === 127) return true;
        // 10.0.0.0/8 (Private)
        if (parts[0] === 10) return true;
        // 172.16.0.0/12 (Private)
        if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
        // 192.168.0.0/16 (Private)
        if (parts[0] === 192 && parts[1] === 168) return true;
        // 0.0.0.0/8 (Current network)
        if (parts[0] === 0) return true;
        // 169.254.0.0/16 (Link-local)
        if (parts[0] === 169 && parts[1] === 254) return true;
        return false;
    }

    // IPv6 checks
    if (net.isIPv6(ip)) {
        // Normalize IPv6 somewhat or use simple prefix checks
        // ::1 (Loopback)
        if (ip === '::1' || ip === '0:0:0:0:0:0:0:1') return true;
        // fc00::/7 (Unique local)
        if (ip.toLowerCase().startsWith('fc') || ip.toLowerCase().startsWith('fd')) return true;
        // fe80::/10 (Link-local)
        if (ip.toLowerCase().startsWith('fe80:')) return true;
        return false;
    }

    return false;
}

/**
 * Custom DNS lookup that blocks private IPs
 */
const ssrfSafeLookup = (
    hostname: string,
    options: dns.LookupOptions,
    callback: (err: NodeJS.ErrnoException | null, address: string | dns.LookupAddress[], family: number) => void
) => {
    dns.lookup(hostname, options, (err, address, family) => {
        if (err) {
            return callback(err, address, family);
        }

        const addresses = Array.isArray(address) ? address : [{ address, family }];

        for (const addr of addresses) {
            if (isPrivateIp(addr.address)) {
                logger.warn(`SSRF attempt blocked: ${hostname} resolved to private IP ${addr.address}`);
                return callback(new Error('Access to private IP denied'), address, family);
            }
        }

        callback(null, address, family);
    });
};

const httpAgent = new http.Agent({ lookup: ssrfSafeLookup });
const httpsAgent = new https.Agent({ lookup: ssrfSafeLookup });

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

            let parsed: URL;
            try {
                parsed = new URL(url);
            } catch (e) {
                throw new ServiceError('Invalid URL', 400);
            }

            if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
                throw new ServiceError('Invalid protocol', 400);
            }

            // If the hostname itself is an IP, check it immediately
            if (net.isIP(parsed.hostname)) {
                if (isPrivateIp(parsed.hostname)) {
                    logger.warn(`SSRF attempt blocked for IP: ${parsed.hostname}`);
                    throw new ServiceError('Access to private IP denied', 400);
                }
            }

            const response = await axios({
                method: 'get',
                url: url,
                responseType: 'stream',
                timeout: 10000,
                maxRedirects: 5,
                httpAgent,
                httpsAgent,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
                    'Accept-Language': 'en-US,en;q=0.9',
                    'Referer': parsed.origin + '/',
                    'Cache-Control': 'no-cache',
                    'Pragma': 'no-cache'
                },
                validateStatus: (status) => status < 400
            });

            const contentType = response.headers['content-type'] as string | undefined;
            const finalContentType = (contentType && contentType.startsWith('image/'))
                ? contentType
                : 'image/png';

            return {
                stream: response.data,
                contentType: finalContentType
            };

        } catch (error: any) {
            if (error instanceof ServiceError) throw error;

            // Handle Axios errors wrapping our custom DNS lookup error
            const isSsrfBlock =
                error.message === 'Access to private IP denied' ||
                (error.cause && error.cause.message === 'Access to private IP denied');

            if (isSsrfBlock) {
                throw new ServiceError('Access to private IP denied', 400);
            }

            logger.warn(`Failed to proxy image: ${url}`, error.message);
            throw new ServiceError('Failed to fetch image', 500);
        }
    }
}
