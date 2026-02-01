import { FastifyRequest, FastifyReply } from 'fastify';
import crypto from 'crypto';
import { config } from '../config/env';
import logger from '../utils/logger';

const TOKEN_LENGTH = 64;
const COOKIE_NAME = 'XSRF-TOKEN';
const HEADER_NAME = 'x-xsrf-token';
const IGNORED_METHODS = ['GET', 'HEAD', 'OPTIONS'];

const generateToken = (): string => {
    return crypto.randomBytes(TOKEN_LENGTH).toString('hex');
};

const signToken = (token: string, secret: string): string => {
    return crypto.createHmac('sha256', secret).update(token).digest('hex');
};

const verifySignature = (token: string, signature: string, secret: string): boolean => {
    const expectedSignature = signToken(token, secret);
    return crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(expectedSignature)
    );
};

const createSignedToken = (secret: string): string => {
    const token = generateToken();
    const signature = signToken(token, secret);
    return `${token}.${signature}`;
};

const parseSignedToken = (signedToken: string): [string, string] | null => {
    const parts = signedToken.split('.');
    if (parts.length !== 2) return null;
    return [parts[0], parts[1]];
};

/**
 * Middleware: CSRF Protection
 * - Verifies CSRF token from header against the signed cookie
 */
export async function csrfProtection(
    request: FastifyRequest,
    reply: FastifyReply
) {
    if (IGNORED_METHODS.includes(request.method)) {
        return;
    }

    const signedCookieToken = request.cookies[COOKIE_NAME];
    const headerToken = request.headers[HEADER_NAME] as string | undefined;

    if (!signedCookieToken || typeof signedCookieToken !== 'string') {
        logger.warn(`CSRF Error: Missing ${COOKIE_NAME} cookie`);
        return reply.status(403).send({
            code: 'EBADCSRFTOKEN',
            message: 'Missing CSRF cookie',
        });
    }

    if (!headerToken || typeof headerToken !== 'string') {
        logger.warn(`CSRF Error: Missing ${HEADER_NAME} header`);
        return reply.status(403).send({
            code: 'EBADCSRFTOKEN',
            message: 'Missing CSRF header',
        });
    }

    const parsed = parseSignedToken(signedCookieToken);
    if (!parsed) {
        logger.warn('CSRF Error: Malformed CSRF cookie');
        return reply.status(403).send({
            code: 'EBADCSRFTOKEN',
            message: 'Invalid CSRF cookie format',
        });
    }

    const [token, signature] = parsed;
    if (!verifySignature(token, signature, config.csrfSecret)) {
        logger.warn('CSRF Error: Invalid CSRF cookie signature');
        return reply.status(403).send({
            code: 'EBADCSRFTOKEN',
            message: 'Invalid CSRF cookie signature',
        });
    }

    if (signedCookieToken !== headerToken) {
        logger.warn('CSRF Error: Token mismatch');
        return reply.status(403).send({
            code: 'EBADCSRFTOKEN',
            message: 'CSRF token mismatch',
        });
    }
}

/**
 * Middleware: Set CSRF Token Cookie
 */
export async function setCsrfTokenCookie(
    request: FastifyRequest,
    reply: FastifyReply
) {
    try {
        const signedToken = createSignedToken(config.csrfSecret);
        request.csrfToken = signedToken;

        reply.setCookie(COOKIE_NAME, signedToken, {
            httpOnly: false,
            secure: config.nodeEnv === 'production',
            sameSite: config.nodeEnv === 'production' ? 'none' : 'lax',
            path: '/',
        });
    } catch (err) {
        logger.error('CSRF Token Generation Error:', err);
        throw err;
    }
}
