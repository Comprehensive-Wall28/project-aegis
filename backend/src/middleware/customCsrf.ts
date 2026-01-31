import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { config } from '../config/env';
import logger from '../utils/logger';

// Constants
const TOKEN_LENGTH = 64; // Length of the random token
const COOKIE_NAME = 'XSRF-TOKEN';
const HEADER_NAME = 'X-XSRF-TOKEN';
const IGNORED_METHODS = ['GET', 'HEAD', 'OPTIONS'];

/**
 * Generate a cryptographically strong random token
 */
const generateToken = (): string => {
    return crypto.randomBytes(TOKEN_LENGTH).toString('hex');
};

/**
 * Sign a token using HMAC-SHA256
 */
const signToken = (token: string, secret: string): string => {
    return crypto
        .createHmac('sha256', secret)
        .update(token)
        .digest('hex');
};

/**
 * Verify a token matches its signature
 */
const verifySignature = (token: string, signature: string, secret: string): boolean => {
    const expectedSignature = signToken(token, secret);
    return crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(expectedSignature)
    );
};

/**
 * Create a signed token string (token + "." + signature)
 */
const createSignedToken = (secret: string): string => {
    const token = generateToken();
    const signature = signToken(token, secret);
    return `${token}.${signature}`;
};

/**
 * Parse a signed token into [token, signature]
 */
const parseSignedToken = (signedToken: string): [string, string] | null => {
    const parts = signedToken.split('.');
    if (parts.length !== 2) return null;
    return [parts[0], parts[1]];
};

/**
 * Middleware: Verify CSRF Token
 * - Skips ignored methods (GET, HEAD, OPTIONS)
 * - Checks for existence of Cookie and Header
 * - Verifies Cookie signature
 * - Verifies Cookie token matches Header token
 */
export const csrfProtection = (req: Request, res: Response, next: NextFunction) => {
    if (IGNORED_METHODS.includes(req.method)) {
        return next();
    }

    const signedCookieToken = req.cookies[COOKIE_NAME];
    const headerToken = req.headers[HEADER_NAME] || req.headers[HEADER_NAME.toLowerCase()];

    if (!signedCookieToken || typeof signedCookieToken !== 'string') {
        logger.warn(`CSRF Error: Missing or invalid ${COOKIE_NAME} cookie`);
        return res.status(403).json({ code: 'EBADCSRFTOKEN', message: 'Missing CSRF cookie' });
    }

    if (!headerToken || typeof headerToken !== 'string') {
        logger.warn(`CSRF Error: Missing or invalid ${HEADER_NAME} header`);
        return res.status(403).json({ code: 'EBADCSRFTOKEN', message: 'Missing CSRF header' });
    }

    // 1. Verify cookie signature
    const parsed = parseSignedToken(signedCookieToken);
    if (!parsed) {
        logger.warn('CSRF Error: Malformed CSRF cookie');
        return res.status(403).json({ code: 'EBADCSRFTOKEN', message: 'Invalid CSRF cookie format' });
    }

    const [token, signature] = parsed;
    if (!verifySignature(token, signature, config.csrfSecret)) {
        logger.warn('CSRF Error: Invalid CSRF cookie signature');
        return res.status(403).json({ code: 'EBADCSRFTOKEN', message: 'Invalid CSRF cookie signature' });
    }

    // 2. Verify header matches cookie token (The header sends the raw token, NOT the signed one usually, 
    //    BUT in the Double Submit Config from the previous library, existing frontend implementation might vary.
    //    Let's check how the previous one worked or how frontend does it.
    //    
    //    Previous implementation:
    //    Server sets cookie 'XSRF-TOKEN'.
    //    Frontend reads 'XSRF-TOKEN' from document.cookie and sends it in 'X-XSRF-TOKEN' header.
    //    
    //    If we sign the cookie value "token.signature", then document.cookie contains "token.signature".
    //    So the frontend will send "token.signature" in the header.
    //    
    //    So we just need to compare cookie value === header value.
    //    AND verify the signature of the cookie value.

    if (signedCookieToken !== headerToken) {
        logger.warn('CSRF Error: Token mismatch');
        return res.status(403).json({ code: 'EBADCSRFTOKEN', message: 'CSRF token mismatch' });
    }

    next();
};

/**
 * Middleware: Generate and Set CSRF Token Cookie
 */
export const csrfTokenCookie = (req: Request, res: Response, next: NextFunction) => {
    try {
        const signedToken = createSignedToken(config.csrfSecret);

        // Expose to locals if needed (though usually frontend reads cookie)
        res.locals.csrfToken = signedToken;

        res.cookie(COOKIE_NAME, signedToken, {
            httpOnly: false, // Must be readable by frontend JS
            secure: config.nodeEnv === 'production',
            sameSite: config.nodeEnv === 'production' ? 'none' : 'lax',
            path: '/',
        });

        next();
    } catch (err) {
        logger.error('CSRF Token Generation Error:', err);
        next(err);
    }
};
