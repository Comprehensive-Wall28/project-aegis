import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

@Injectable()
export class CsrfService {
    private readonly logger = new Logger(CsrfService.name);
    private readonly TOKEN_LENGTH = 64;

    constructor(private configService: ConfigService) { }

    private generateToken(): string {
        return crypto.randomBytes(this.TOKEN_LENGTH).toString('hex');
    }

    private signToken(token: string, secret: string): string {
        return crypto
            .createHmac('sha256', secret)
            .update(token)
            .digest('hex');
    }

    private verifySignature(token: string, signature: string, secret: string): boolean {
        const expectedSignature = this.signToken(token, secret);
        return crypto.timingSafeEqual(
            Buffer.from(signature),
            Buffer.from(expectedSignature)
        );
    }

    createSignedToken(): string {
        const secret = this.configService.get<string>('CSRF_SECRET');
        if (!secret) throw new Error('CSRF_SECRET not configured');

        const token = this.generateToken();
        const signature = this.signToken(token, secret);
        return `${token}.${signature}`;
    }

    parseSignedToken(signedToken: string): [string, string] | null {
        const parts = signedToken.split('.');
        if (parts.length !== 2) return null;
        return [parts[0], parts[1]];
    }

    verifyCsrf(signedCookieToken: string, headerToken: string): boolean {
        const secret = this.configService.get<string>('CSRF_SECRET');
        if (!secret) throw new Error('CSRF_SECRET not configured');

        if (!signedCookieToken || typeof signedCookieToken !== 'string') {
            this.logger.warn('CSRF Error: Missing or invalid CSRF cookie');
            return false;
        }

        if (!headerToken || typeof headerToken !== 'string') {
            this.logger.warn('CSRF Error: Missing or invalid CSRF header');
            return false;
        }

        // 1. Verify cookie signature
        const parsed = this.parseSignedToken(signedCookieToken);
        if (!parsed) {
            this.logger.warn('CSRF Error: Malformed CSRF cookie');
            return false;
        }

        const [token, signature] = parsed;
        if (!this.verifySignature(token, signature, secret)) {
            this.logger.warn('CSRF Error: Invalid CSRF cookie signature');
            return false;
        }

        // 2. Verify header matches cookie token
        if (signedCookieToken !== headerToken) {
            this.logger.warn('CSRF Error: Token mismatch');
            return false;
        }

        return true;
    }
}
