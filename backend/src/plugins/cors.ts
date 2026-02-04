import { FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';
import fastifyCors from '@fastify/cors';
import { config } from '../config/env';
import logger from '../utils/logger';

async function cors(fastify: FastifyInstance) {
    const allowedOrigins = [
        config.clientOrigin,
        'http://localhost:3000',
        'http://localhost:5173',
        'http://localhost:4173'
    ].filter((origin): origin is string => !!origin);

    logger.info(`CORS: Allowed origins - ${allowedOrigins.join(', ')}`);

    // Register @fastify/cors with proper configuration
    await fastify.register(fastifyCors, {
        origin: allowedOrigins,
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
        allowedHeaders: [
            'Content-Type',
            'Content-Length',
            'Content-Range',
            'Authorization', 
            'X-CSRF-Token',
            'x-csrf-token',
            'X-XSRF-Token',
            'x-xsrf-token',
            'Cookie'
        ],
        exposedHeaders: [
            'X-CSRF-Token', 
            'x-csrf-token', 
            'Set-Cookie',
            'Range',
            'Content-Range',
            'X-Encapsulated-Key',
            'X-Encrypted-Symmetric-Key'
        ]
    });
}

export const corsPlugin = fp(cors, {
    name: 'cors-plugin',
    fastify: '5.x'
});
