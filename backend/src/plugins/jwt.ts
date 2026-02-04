import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import fastifyPlugin from 'fastify-plugin';
import fastifyJwt from '@fastify/jwt';
import fastifyCookie from '@fastify/cookie';
import { config } from '../config/env';
import logger from '../utils/logger';
import { decryptToken } from '../utils/cryptoUtils';
import User from '../models/User';

export async function jwtPlugin(fastify: FastifyInstance) {
    // Register cookie parser first
    await fastify.register(fastifyCookie);

    // Register JWT plugin
    await fastify.register(fastifyJwt, {
        secret: config.jwtSecret,
        // Don't automatically verify - we need to decrypt first
        trusted: () => false
    });

    // Create authentication decorator
    fastify.decorate('authenticate', async function (request: FastifyRequest, reply: FastifyReply) {
        let token: string | undefined;

        // Check for token in Authorization header (Bearer <token>)
        const authHeader = request.headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
            token = authHeader.split(' ')[1];
        }
        // Fallback to cookies (HTTP-only)
        else if (request.cookies?.token) {
            token = request.cookies.token;
        }

        if (!token) {
            return reply.code(401).send({ message: 'Not authorized, no token' });
        }

        try {
            // MITIGATION: Decrypt the token first (maintains compatibility with existing system)
            const decryptedToken = await decryptToken(token);
            
            // Verify JWT
            const decoded = fastify.jwt.verify(decryptedToken) as any;

            // MITIGATION: Validate tokenVersion against database to ensure token hasn't been invalidated
            // This is critical for logout functionality
            const user = await User.findById(decoded.id).select('tokenVersion').lean();
            if (!user) {
                logger.warn(`Authentication failed: user ${decoded.id} not found`);
                return reply.code(401).send({ message: 'Not authorized, user not found' });
            }

            // Check if token version matches (tokens before logout are invalid)
            const currentTokenVersion = user.tokenVersion || 0;
            const tokenVersion = decoded.tokenVersion ?? 0;
            if (tokenVersion !== currentTokenVersion) {
                logger.warn(`Token version mismatch for user ${decoded.id}: token=${tokenVersion}, current=${currentTokenVersion}`);
                return reply.code(401).send({ message: 'Not authorized, token invalidated' });
            }

            // Attach user to request
            request.user = decoded;
        } catch (error) {
            logger.error('Auth middleware error:', error);
            return reply.code(401).send({ message: 'Not authorized, token failed' });
        }
    });
}

// Export wrapped in fastify-plugin to avoid encapsulation
export default fastifyPlugin(jwtPlugin);
