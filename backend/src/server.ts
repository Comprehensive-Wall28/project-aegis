import buildApp from './app';
import SocketManager from './utils/SocketManager';
import { config } from './config/env';
import logger from './utils/logger';

const PORT = config.port;

// Get allowed origins from app config approach (or environment)
const allowedOrigins = [
    config.clientOrigin,
    'http://localhost:3000',
    'http://localhost:5173'
].filter((origin): origin is string => !!origin);

async function start() {
    try {
        // Build Fastify app
        const fastify = await buildApp();
        
        // Start server
        // MITIGATION: Use fastify.server for Socket.IO integration
        await fastify.listen({ port: PORT, host: '0.0.0.0' });
        logger.info(`Server running in ${config.nodeEnv} mode on port ${PORT}`);

        // Initialize Socket.IO with Fastify server
        SocketManager.init(fastify.server, allowedOrigins);

        // Graceful shutdown handling
        const gracefulShutdown = (signal: string) => {
            logger.info(`\n${signal} received. Shutting down gracefully...`);

            // Close Fastify
            fastify.close().then(() => {
                logger.info('HTTP server closed.');

                // Close Socket.IO connections
                const io = SocketManager.getIO();
                if (io) {
                    io.close(() => {
                        logger.info('Socket.IO connections closed.');
                        process.exit(0);
                    });
                } else {
                    process.exit(0);
                }
            }).catch(err => {
                logger.error('Error during shutdown:', err);
                process.exit(1);
            });

            // Force exit after 10s if graceful shutdown fails
            setTimeout(() => {
                logger.error('Forced shutdown after timeout.');
                process.exit(1);
            }, 10000);
        };

        process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
        process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    } catch (err) {
        logger.error('Failed to start server:', err);
        process.exit(1);
    }
}

start();
