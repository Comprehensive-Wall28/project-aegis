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
            socket.on('join-room', (roomId: string) => {
                socket.join(roomId);
            });

            socket.on('leave-room', (roomId: string) => {
                socket.leave(roomId);
            });
        });
    }

    public broadcastToRoom(roomId: string, event: string, data: any): void {
        if (!this.io) {
            logger.warn('SocketManager: Attempted to broadcast before initialization');
            return;
        }
        this.io.to(roomId).emit(event, data);
    }

    public getIO(): SocketServer | null {
        return this.io;
    }
}

export default SocketManager.getInstance();
