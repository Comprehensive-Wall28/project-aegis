import { FastifyInstance } from 'fastify';
import fastifyHelmet from '@fastify/helmet';
import { config } from '../config/env';

export async function helmetPlugin(fastify: FastifyInstance) {
    const allowedOrigins = [
        config.clientOrigin,
        'http://localhost:3000',
        'http://localhost:5173'
    ].filter((origin): origin is string => !!origin);

    await fastify.register(fastifyHelmet, {
        crossOriginResourcePolicy: { policy: "cross-origin" },
        contentSecurityPolicy: {
            directives: {
                defaultSrc: ["'self'"],
                scriptSrc: ["'self'"],
                styleSrc: ["'self'"],
                imgSrc: ["'self'", "data:", ...allowedOrigins],
                connectSrc: ["'self'"],
                objectSrc: ["'none'"],
                upgradeInsecureRequests: [],
            }
        }
    });
}
