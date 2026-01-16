import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import * as crypto from 'crypto';

interface AuthRequest extends Request {
    user?: any;
}

function getCookieEncryptionKey(): Buffer {
    const secret = process.env.COOKIE_ENCRYPTION_KEY || process.env.JWT_SECRET;
    if (!secret) {
        throw new Error('Missing encryption key');
    }
    return crypto.scryptSync(secret, 'salt', 32);
}

function decryptToken(encryptedToken: string): string {
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

export const protect = (req: AuthRequest, res: Response, next: NextFunction) => {
    let token: string | undefined;

    // Check for token in cookies (HTTP-only)
    if (req.cookies?.token) {
        token = req.cookies.token;
    }

    if (!token) {
        return res.status(401).json({ message: 'Not authorized, no token' });
    }

    try {
        const decryptedToken = decryptToken(token);
        const decoded = jwt.verify(decryptedToken, process.env.JWT_SECRET || 'secret');
        req.user = decoded;
        next();
    } catch (error) {
        console.error('Auth middleware error:', error);
        return res.status(401).json({ message: 'Not authorized, token failed' });
    }
};
