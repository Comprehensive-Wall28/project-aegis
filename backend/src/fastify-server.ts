import { buildApp } from './fastify-app';
import { config } from './config/env';
import logger from './utils/logger';
import SocketManager from './utils/SocketManager';

async function start() {
    try {
        // Build Fastify app
        const app = await buildApp();

        // Configure Socket.IO
        const allowedOrigins = [
            config.clientOrigin,
            'http://localhost:3000',
            'http://localhost:5173',
        ].filter((origin): origin is string => !!origin);

        // Initialize Socket.IO with Fastify server
        SocketManager.init(app.server, allowedOrigins);

        // Start listening
        await app.listen({
            port: config.port,
            host: '0.0.0.0', // Critical for Docker - binds to all interfaces
        });

        logger.info(`🚀 Fastify server running on port ${config.port} in ${config.nodeEnv} mode`);
        logger.info(`📡 Socket.IO initialized`);
        logger.info(`🔗 CORS allowed origins: ${allowedOrigins.join(', ')}`);
    } catch (err) {
        logger.error('Failed to start Fastify server:', err);
        process.exit(1);
    }
}

// Graceful shutdown
const gracefulShutdown = async (signal: string) => {
    logger.info(`\n${signal} received. Shutting down gracefully...`);

    try {
        const app = await buildApp();
        await app.close();
        logger.info('Fastify server closed');

        // Close Socket.IO
        const io = SocketManager.getIO();
        if (io) {
            io.close(() => {
                logger.info('Socket.IO connections closed');
                process.exit(0);
            });
        } else {
            process.exit(0);
        }
    } catch (err) {
        logger.error('Error during graceful shutdown:', err);
        process.exit(1);
    }
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Start server
start();
