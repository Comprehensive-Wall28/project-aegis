import * as crypto from 'crypto';
import { promisify } from 'util';
import { ConfigService } from '@nestjs/config';
import { Injectable } from '@nestjs/common';

const scrypt = promisify(crypto.scrypt);

@Injectable()
export class CryptoUtils {
    private cachedKey: Buffer | null = null;
    private derivationPromise: Promise<Buffer> | null = null;

    constructor(private configService: ConfigService) { }

    /**
     * Derives and caches the encryption key from environment variables.
     * Uses async scrypt and caches the result.
     */
    private async getCookieEncryptionKey(): Promise<Buffer> {
        if (this.cachedKey) {
            return this.cachedKey;
        }

        if (this.derivationPromise) {
            return this.derivationPromise;
        }

        const secret =
            this.configService.get<string>('app.auth.cookieEncryptionKey') ||
            this.configService.get<string>('app.auth.jwtSecret');

        if (!secret) {
            throw new Error(
                'Missing encryption key (COOKIE_ENCRYPTION_KEY or JWT_SECRET)',
            );
        }

        this.derivationPromise = (async () => {
            try {
                const key = (await scrypt(secret, 'salt', 32)) as Buffer;
                this.cachedKey = key;
                return key;
            } finally {
                this.derivationPromise = null;
            }
        })();

        return this.derivationPromise;
    }

    /**
     * Encrypts a plaintext string (JWT) using AES-256-GCM.
     */
    async encryptToken(plaintext: string): Promise<string> {
        const key = await this.getCookieEncryptionKey();
        const iv = crypto.randomBytes(12);
        const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

        const encrypted = Buffer.concat([
            cipher.update(plaintext, 'utf8'),
            cipher.final(),
        ]);
        const authTag = cipher.getAuthTag();

        // Combine IV (12), encrypted content, and auth tag (16)
        const combined = Buffer.concat([iv, encrypted, authTag]);
        return combined.toString('base64');
    }

    /**
     * Decrypts a base64 encoded token back to plaintext.
     */
    async decryptToken(encryptedToken: string): Promise<string> {
        const key = await this.getCookieEncryptionKey();
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

        return Buffer.concat([
            decipher.update(encrypted),
            decipher.final(),
        ]).toString('utf8');
    }
}
