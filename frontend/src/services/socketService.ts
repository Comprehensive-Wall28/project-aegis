import { io, Socket } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

class SocketService {
    private socket: Socket | null = null;
    private static instance: SocketService;
    private _isConnected: boolean = false;
    private _reconnectAttempts: number = 0;

    private constructor() { }

    public static getInstance(): SocketService {
        if (!SocketService.instance) {
            SocketService.instance = new SocketService();
        }
        return SocketService.instance;
    }

    public get isConnected(): boolean {
        return this._isConnected;
    }

    public get reconnectAttempts(): number {
        return this._reconnectAttempts;
    }

    public connect(): void {
        if (this.socket?.connected) return;

        this.socket = io(SOCKET_URL, {
            withCredentials: true,
            transports: ['websocket', 'polling'],
            // Robust reconnection settings
            reconnection: true,
            reconnectionAttempts: Infinity,
            reconnectionDelay: 1000,
            reconnectionDelayMax: 30000,
            randomizationFactor: 0.5,
            timeout: 20000,
        });

        this.socket.on('connect', () => {
            console.log('[Socket] Connected:', this.socket?.id);
            this._isConnected = true;
            this._reconnectAttempts = 0;
        });

        this.socket.on('disconnect', (reason) => {
            console.log('[Socket] Disconnected:', reason);
            this._isConnected = false;

            // If server disconnected us, we should try to reconnect
            if (reason === 'io server disconnect') {
                console.log('[Socket] Server initiated disconnect, attempting reconnect...');
                this.socket?.connect();
            }
        });

        this.socket.on('reconnect_attempt', (attempt) => {
            this._reconnectAttempts = attempt;
            console.log(`[Socket] Reconnection attempt ${attempt}`);
        });

        this.socket.on('reconnect', (attemptNumber) => {
            console.log(`[Socket] Reconnected after ${attemptNumber} attempts`);
            this._reconnectAttempts = 0;
        });

        this.socket.on('reconnect_failed', () => {
            console.error('[Socket] Reconnection failed after maximum attempts');
        });

        this.socket.on('connect_error', (error) => {
            console.error('[Socket] Connection error:', error.message);
        });
    }

    public joinRoom(roomId: string): void {
        if (!this.socket) this.connect();
        if (this._isConnected) {
            this.socket?.emit('join-room', roomId);
        } else {
            // Queue the join for when connected
            this.socket?.once('connect', () => {
                this.socket?.emit('join-room', roomId);
            });
        }
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
        this._isConnected = false;
        this._reconnectAttempts = 0;
    }
}

export default SocketService.getInstance();

