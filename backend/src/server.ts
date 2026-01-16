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
