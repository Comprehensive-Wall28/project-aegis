import { Injectable, Logger, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import axios from 'axios';
import { Readable, PassThrough } from 'stream';
import * as dns from 'dns';
import * as net from 'net';
import * as http from 'http';
import * as https from 'https';
import { CachedImageRepository } from './repositories/cached-image.repository';
import { GridFsService } from '../vault/gridfs.service';

const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:122.0) Gecko/20100101 Firefox/122.0',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 14.2; rv:121.0) Gecko/20100101 Firefox/121.0',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36 Edg/121.0.0.0',
];

export interface ProxyImageResponse {
  stream: Readable;
  contentType: string;
}

/**
 * Checks if an IP address is private/internal (SSRF protection)
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
  callback: (err: NodeJS.ErrnoException | null, address: string | dns.LookupAddress[], family: number) => void,
) => {
  dns.lookup(hostname, options, (err, address, family) => {
    if (err) {
      return callback(err, address, family);
    }

    const addresses = Array.isArray(address) ? address : [{ address, family }];

    for (const addr of addresses) {
      if (isPrivateIp(addr.address)) {
        return callback(new Error('Access to private IP denied'), address, family);
      }
    }

    callback(null, address, family);
  });
};

const httpAgent = new http.Agent({ lookup: ssrfSafeLookup as any });
const httpsAgent = new https.Agent({ lookup: ssrfSafeLookup as any });

function getRandomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * ImageProxyService handles proxying images with SSRF protection and caching
 */
@Injectable()
export class ImageProxyService {
  private readonly logger = new Logger(ImageProxyService.name);

  constructor(
    private readonly cachedImageRepo: CachedImageRepository,
    private readonly gridFsService: GridFsService,
  ) {}

  /**
   * Proxy an image URL to bypass CORS and mask user IP.
   * Caches successful responses in GridFS (linkImages bucket).
   */
  async proxyImage(url: string, retryCount = 0): Promise<ProxyImageResponse> {
    const MAX_RETRIES = 2; // Total 3 attempts

    try {
      if (!url) {
        throw new BadRequestException('URL is required');
      }

      // 1. Check Cache
      try {
        const cached = await this.cachedImageRepo.findByUrl(url);
        if (cached) {
          try {
            const downloadStream = this.gridFsService.getFileStreamFromBucket(
              cached.fileId,
              'linkImages',
            );

            return {
              stream: downloadStream,
              contentType: cached.contentType,
            };
          } catch (err: any) {
            this.logger.error(`GridFS download failed for cached file: ${err.message}`, err.stack);
            // If file is missing in GridFS but exists in DB, re-fetch
          }
        }
      } catch (err) {
        this.logger.warn(`Cache lookup failed for ${url}`, err);
        // Continue to fetch if cache fails
      }

      let parsed: URL;
      try {
        parsed = new URL(url);
      } catch (e) {
        throw new BadRequestException('Invalid URL');
      }

      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        throw new BadRequestException('Invalid protocol');
      }

      // If the hostname itself is an IP, check it immediately
      if (net.isIP(parsed.hostname)) {
        if (isPrivateIp(parsed.hostname)) {
          this.logger.warn(`SSRF attempt blocked for IP: ${parsed.hostname}`);
          throw new BadRequestException('Access to private IP denied');
        }
      }

      const headers = {
        'User-Agent': getRandomItem(USER_AGENTS),
        'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Referer': parsed.origin + '/',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
        'Sec-Ch-Ua': '"Not A(Brand";v="99", "Google Chrome";v="121", "Chromium";v="121"',
        'Sec-Ch-Ua-Mobile': '?0',
        'Sec-Ch-Ua-Platform': '"Windows"',
        'Upgrade-Insecure-Requests': '1',
      };

      const response = await axios({
        method: 'get',
        url: url,
        responseType: 'stream',
        timeout: 10000,
        maxRedirects: 5,
        httpAgent,
        httpsAgent,
        headers,
        validateStatus: (status: number) => status < 400,
      });

      const contentType = response.headers['content-type'] as string | undefined;
      const finalContentType =
        contentType && contentType.startsWith('image/') ? contentType : 'image/png';

      // 2. Cache the result (Fork the stream)
      const userStream = new PassThrough();
      const cacheStream = new PassThrough();

      response.data.pipe(userStream);
      response.data.pipe(cacheStream);

      // Handle Caching Async (fire-and-forget)
      (async () => {
        try {
          const filename = `proxy-cache-${Date.now()}-${Math.random().toString(36).substring(7)}`;
          const fileId = await this.gridFsService.uploadBufferToBucket(
            await this.streamToBuffer(cacheStream),
            filename,
            'linkImages',
            {
              originalUrl: url,
              contentType: finalContentType,
            },
          );

          // Save to cache DB
          this.cachedImageRepo.createAsync(url, fileId, finalContentType, 0);

          this.logger.log(`Cached image for ${url} (FileID: ${fileId})`);
        } catch (err: any) {
          this.logger.error(`Failed to cache image for ${url}: ${err.message}`, err.stack);
        }
      })();

      return {
        stream: userStream,
        contentType: finalContentType,
      };
    } catch (error: any) {
      if (error instanceof BadRequestException) throw error;

      // Handle Axios errors wrapping our custom DNS lookup error
      const isSsrfBlock =
        error.message === 'Access to private IP denied' ||
        (error.cause && error.cause.message === 'Access to private IP denied');

      if (isSsrfBlock) {
        throw new BadRequestException('Access to private IP denied');
      }

      // Retry Logic for 5xx errors or timeouts
      const status = error.response?.status;
      const isRetryable =
        status === 502 ||
        status === 503 ||
        status === 504 ||
        error.code === 'ECONNABORTED' ||
        error.code === 'ETIMEDOUT';

      if (isRetryable && retryCount < MAX_RETRIES) {
        const delay = (retryCount + 1) * 1000;
        this.logger.warn(
          `Proxy failed (${status || error.message}) for ${url}. Retrying in ${delay}ms... (Attempt ${retryCount + 1})`,
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
        return this.proxyImage(url, retryCount + 1);
      }

      this.logger.warn(`Failed to proxy image: ${url}`, {
        error: error.message,
        status,
      });
      throw new InternalServerErrorException('Failed to fetch image');
    }
  }

  /**
   * Convert stream to buffer
   */
  private async streamToBuffer(stream: Readable): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];
      stream.on('data', (chunk) => chunks.push(chunk));
      stream.on('error', reject);
      stream.on('end', () => resolve(Buffer.concat(chunks)));
    });
  }
}
