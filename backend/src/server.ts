import http from 'http';
import app from './app';
import SocketManager from './utils/SocketManager';

const PORT = process.env.PORT || 5000;
const server = http.createServer(app);

// Get allowed origins from app config approach (or environment)
const allowedOrigins = [
    process.env.CLIENT_ORIGIN,
    'http://localhost:3000',
    'http://localhost:5173'
].filter((origin): origin is string => !!origin);

SocketManager.init(server, allowedOrigins);

server.listen(PORT, () => {
    console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
});

// Graceful shutdown handling
const gracefulShutdown = (signal: string) => {
    console.log(`\n${signal} received. Shutting down gracefully...`);

    // Stop accepting new connections
    server.close(() => {
        console.log('HTTP server closed.');

        // Close Socket.IO connections
        const io = SocketManager.getIO();
        if (io) {
            io.close(() => {
                console.log('Socket.IO connections closed.');
                process.exit(0);
            });
        } else {
            process.exit(0);
        }
    });

    // Force exit after 10s if graceful shutdown fails
    setTimeout(() => {
        console.error('Forced shutdown after timeout.');
        process.exit(1);
    }, 10000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
