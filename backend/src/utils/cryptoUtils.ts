import * as crypto from 'crypto';
import { promisify } from 'util';
import { config } from '../config/env';

const scrypt = promisify(crypto.scrypt);

let cachedKey: Buffer | null = null;
let derivationPromise: Promise<Buffer> | null = null;

/**
 * Derives and caches the encryption key from environment variables.
 * Uses async scrypt and caches the result.
 */
async function getCookieEncryptionKey(): Promise<Buffer> {
    if (cachedKey) {
        return cachedKey;
    }

    if (derivationPromise) {
        return derivationPromise;
    }

    const secret = config.cookieEncryptionKey || config.jwtSecret;
    if (!secret) {
        throw new Error('Missing encryption key (COOKIE_ENCRYPTION_KEY or JWT_SECRET)');
    }

    derivationPromise = (async () => {
        try {
            const key = (await scrypt(secret, 'salt', 32)) as Buffer;
            cachedKey = key;
            return key;
        } finally {
            derivationPromise = null;
        }
    })();

    return derivationPromise;
}

/**
 * Encrypts a plaintext string (JWT) using AES-256-GCM.
 */
export async function encryptToken(plaintext: string): Promise<string> {
    const key = await getCookieEncryptionKey();
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

    const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
    const authTag = cipher.getAuthTag();

    // Combine IV (12), encrypted content, and auth tag (16)
    const combined = Buffer.concat([iv, encrypted, authTag]);
    return combined.toString('base64');
}

/**
 * Decrypts a base64 encoded token back to plaintext.
 */
export async function decryptToken(encryptedToken: string): Promise<string> {
    const key = await getCookieEncryptionKey();
    const buffer = Buffer.from(encryptedToken, 'base64');

    // Minimal sanity check: IV (12) + Tag (16) = 28 bytes
    if (buffer.length < 28) {
        throw new Error('Invalid token length');
    }

    const iv = buffer.subarray(0, 12);
    const encrypted = buffer.subarray(12, buffer.length - 16);
    const authTag = buffer.subarray(buffer.length - 16);

    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(authTag);

    return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8');
}
