import { Server as SocketServer } from 'socket.io';
import { Server as HttpServer } from 'http';
import logger from './logger';

class SocketManager {
    private io: SocketServer | null = null;
    private static instance: SocketManager;

    private constructor() { }

    public static getInstance(): SocketManager {
        if (!SocketManager.instance) {
            SocketManager.instance = new SocketManager();
        }
        return SocketManager.instance;
    }

    public init(server: HttpServer, allowedOrigins: string[]): void {
        this.io = new SocketServer(server, {
            cors: {
                origin: allowedOrigins,
                methods: ['GET', 'POST'],
                credentials: true
            },
            pingInterval: 10000,
            pingTimeout: 5000,
        });

        this.io.on('connection', (socket) => {
            logger.info(`Socket connected: ${socket.id}`);

            socket.on('join-room', (roomId: string) => {
                socket.join(roomId);
                logger.info(`Socket ${socket.id} joined room: ${roomId}`);
            });

            socket.on('leave-room', (roomId: string) => {
                socket.leave(roomId);
                logger.info(`Socket ${socket.id} left room: ${roomId}`);
            });

            socket.on('disconnect', () => {
                logger.info(`Socket disconnected: ${socket.id}`);
            });
        });
    }

    public broadcastToRoom(roomId: string, event: string, data: any): void {
        if (!this.io) {
            logger.warn('SocketManager: Attempted to broadcast before initialization');
            return;
        }
        this.io.to(roomId).emit(event, data);
        logger.info(`Broadcasted event ${event} to room ${roomId}`);
    }

    public getIO(): SocketServer | null {
        return this.io;
    }
}

export default SocketManager.getInstance();
