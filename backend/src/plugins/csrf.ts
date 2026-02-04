import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import fastifyPlugin from 'fastify-plugin';
import crypto from 'crypto';
import { config } from '../config/env';
import logger from '../utils/logger';

// Constants - maintain compatibility with existing implementation
const TOKEN_LENGTH = 64;
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

export async function csrfPlugin(fastify: FastifyInstance) {
    /**
     * CSRF Protection Hook
     * MITIGATION: Maintains exact compatibility with existing custom CSRF implementation
     * - Skips ignored methods (GET, HEAD, OPTIONS)
     * - Verifies Cookie signature using HMAC
     * - Verifies Cookie token matches Header token (double-submit pattern)
     */
    const csrfProtection = async function (request: FastifyRequest, reply: FastifyReply) {
        // Skip CSRF for safe methods
        if (IGNORED_METHODS.includes(request.method)) {
            return;
        }

        const signedCookieToken = request.cookies[COOKIE_NAME];
        const headerToken = (request.headers[HEADER_NAME] || request.headers[HEADER_NAME.toLowerCase()]) as string;

        // Check for cookie presence
        if (!signedCookieToken || typeof signedCookieToken !== 'string') {
            logger.warn(`CSRF Error: Missing or invalid ${COOKIE_NAME} cookie`);
            return reply.code(403).send({ code: 'EBADCSRFTOKEN', message: 'Missing CSRF cookie' });
        }

        // Check for header presence
        if (!headerToken || typeof headerToken !== 'string') {
            logger.warn(`CSRF Error: Missing or invalid ${HEADER_NAME} header`);
            return reply.code(403).send({ code: 'EBADCSRFTOKEN', message: 'Missing CSRF header' });
        }

        // Verify cookie signature
        const parsed = parseSignedToken(signedCookieToken);
        if (!parsed) {
            logger.warn('CSRF Error: Malformed CSRF cookie');
            return reply.code(403).send({ code: 'EBADCSRFTOKEN', message: 'Invalid CSRF cookie format' });
        }

        const [token, signature] = parsed;
        if (!verifySignature(token, signature, config.csrfSecret)) {
            logger.warn('CSRF Error: Invalid CSRF cookie signature');
            return reply.code(403).send({ code: 'EBADCSRFTOKEN', message: 'Invalid CSRF cookie signature' });
        }

        // Verify header matches cookie token (double-submit pattern)
        // The frontend sends the entire signed token in the header
        if (signedCookieToken !== headerToken) {
            logger.warn('CSRF Error: Token mismatch');
            return reply.code(403).send({ code: 'EBADCSRFTOKEN', message: 'CSRF token mismatch' });
        }
    };

    /**
     * CSRF Token Cookie Generator Hook
     * MITIGATION: Generates signed CSRF tokens matching existing implementation
     */
    const csrfTokenCookie = async function (request: FastifyRequest, reply: FastifyReply) {
        try {
            const signedToken = createSignedToken(config.csrfSecret);

            // Set cookie with same settings as Express implementation
            reply.setCookie(COOKIE_NAME, signedToken, {
                httpOnly: false, // Must be readable by frontend JS
                secure: config.nodeEnv === 'production',
                sameSite: config.nodeEnv === 'production' ? 'none' : 'lax',
                path: '/',
            });
        } catch (err) {
            logger.error('CSRF Token Generation Error:', err);
            throw err;
        }
    };

    // Register as decorators
    fastify.decorate('csrfProtection', csrfProtection);
    fastify.decorate('csrfTokenCookie', csrfTokenCookie);
}

// Export wrapped in fastify-plugin to avoid encapsulation
export default fastifyPlugin(csrfPlugin);
