import { io, Socket } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

class SocketService {
    private socket: Socket | null = null;
    private static instance: SocketService;

    private constructor() { }

    public static getInstance(): SocketService {
        if (!SocketService.instance) {
            SocketService.instance = new SocketService();
        }
        return SocketService.instance;
    }

    public connect(): void {
        if (this.socket?.connected) return;

        this.socket = io(SOCKET_URL, {
            withCredentials: true,
            transports: ['websocket', 'polling']
        });

        this.socket.on('connect', () => {
            console.log('Socket connected:', this.socket?.id);
        });

        this.socket.on('disconnect', () => {
            console.log('Socket disconnected');
        });

        this.socket.on('connect_error', (error) => {
            console.error('Socket connection error:', error);
        });
    }

    public joinRoom(roomId: string): void {
        if (!this.socket) this.connect();
        this.socket?.emit('join-room', roomId);
    }

    public leaveRoom(roomId: string): void {
        this.socket?.emit('leave-room', roomId);
    }

    public on(event: string, callback: (data: any) => void): void {
        if (!this.socket) this.connect();
        this.socket?.on(event, callback);
    }

    public off(event: string, callback: (data: any) => void): void {
        this.socket?.off(event, callback);
    }

    /**
     * Remove all listeners for a specific event.
     * Use this when you don't have a reference to the original callback.
     */
    public removeAllListeners(event: string): void {
        this.socket?.removeAllListeners(event);
    }

    public disconnect(): void {
        this.socket?.disconnect();
        this.socket = null;
    }
}

export default SocketService.getInstance();
