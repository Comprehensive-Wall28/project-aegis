import { FastifyRequest, FastifyReply } from 'fastify';
import jwt from 'jsonwebtoken';
import { decryptToken } from '../utils/cryptoUtils';
import { config } from '../config/env';
import logger from '../utils/logger';

/**
 * Middleware: Authenticate User
 * - Extracts token from Authorization header or Cookie
 * - Decrypts and verifies JWT
 * - Attaches user to request object
 */
export async function authenticateUser(
    request: FastifyRequest,
    reply: FastifyReply
) {
    let token: string | undefined;

    // Check Authorization header
    const authHeader = request.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.split(' ')[1];
    }
    // Fallback to cookies
    else if (request.cookies?.token) {
        token = request.cookies.token;
    }

    if (!token) {
        return reply.status(401).send({ message: 'Not authorized, no token' });
    }

    try {
        const decryptedToken = await decryptToken(token);
        const decoded = jwt.verify(decryptedToken, config.jwtSecret) as any;
        request.user = decoded;
    } catch (error) {
        logger.error('Auth verification error:', error);
        return reply.status(401).send({ message: 'Not authorized, token failed' });
    }
}
