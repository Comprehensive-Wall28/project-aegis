import * as crypto from 'crypto';

let cachedKey: Buffer | null = null;

/**
 * Derives and caches the encryption key from environment variables.
 * Uses scryptSync but caches the result to avoid blocking the event loop on subsequent calls.
 */
function getCookieEncryptionKey(): Buffer {
    if (cachedKey) {
        return cachedKey;
    }

    const secret = process.env.COOKIE_ENCRYPTION_KEY || process.env.JWT_SECRET;
    if (!secret) {
        throw new Error('Missing encryption key (COOKIE_ENCRYPTION_KEY or JWT_SECRET)');
    }

    // scryptSync is expensive/blocking, but we only call it once at startup or first need.
    cachedKey = crypto.scryptSync(secret, 'salt', 32);
    return cachedKey;
}

/**
 * Encrypts a plaintext string (JWT) using AES-256-GCM.
 */
export function encryptToken(plaintext: string): string {
    const key = getCookieEncryptionKey();
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
export function decryptToken(encryptedToken: string): string {
    const key = getCookieEncryptionKey();
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
