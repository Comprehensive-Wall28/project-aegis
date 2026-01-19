import http from 'http';
import app from './app';
import SocketManager from './utils/SocketManager';
import { config } from './config/env';
import logger from './utils/logger';

const PORT = config.port;
const server = http.createServer(app);

// Get allowed origins from app config approach (or environment)
const allowedOrigins = [
    config.clientOrigin,
    'http://localhost:3000',
    'http://localhost:5173'
].filter((origin): origin is string => !!origin);

SocketManager.init(server, allowedOrigins);

server.listen(PORT, () => {
    logger.info(`Server running in ${config.nodeEnv} mode on port ${PORT}`);
});

// Graceful shutdown handling
const gracefulShutdown = (signal: string) => {
    logger.info(`\n${signal} received. Shutting down gracefully...`);

    // Stop accepting new connections
    server.close(() => {
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
    });

    // Force exit after 10s if graceful shutdown fails
    setTimeout(() => {
        logger.error('Forced shutdown after timeout.');
        process.exit(1);
    }, 10000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
