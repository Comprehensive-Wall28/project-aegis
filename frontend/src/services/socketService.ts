import { io, Socket } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

class SocketService {
    private socket: Socket | null = null;
    private static instance: SocketService;
    private _isConnected: boolean = false;
    private _reconnectAttempts: number = 0;
    private _currentRoomId: string | null = null;

    private _listeners: Map<string, Set<(data: unknown) => void>> = new Map();

    private constructor() {
        this.setupVisibilityListener();
    }

    public static getInstance(): SocketService {
        if (!SocketService.instance) {
            SocketService.instance = new SocketService();
        }
        return SocketService.instance;
    }

    private setupVisibilityListener(): void {
        if (typeof document !== 'undefined') {
            document.addEventListener('visibilitychange', () => {
                if (document.visibilityState === 'visible') {
                    this.checkConnection();
                }
            });
        }
    }

    public checkConnection(): void {
        if (!this.socket) {
            this.connect();
            return;
        }

        if (!this.socket.connected) {
            this.socket.connect();
        } else {
            // Heartbeat check
            this.socket.emit('ping');
        }
    }

    public get isConnected(): boolean {
        return this._isConnected;
    }

    public get reconnectAttempts(): number {
        return this._reconnectAttempts;
    }

    public connect(): void {
        if (this.socket?.connected) return;

        console.log('[Socket] Initializing new socket instance');
        this.socket = io(SOCKET_URL, {
            withCredentials: true,
            transports: ['websocket', 'polling'],
            // Robust reconnection settings
            reconnection: true,
            reconnectionAttempts: Infinity,
            reconnectionDelay: 1000,
            reconnectionDelayMax: 5000, // Faster ramp up
            randomizationFactor: 0.5,
            timeout: 20000,
        });

        // Re-attach all registered listeners to the new socket instance
        this._listeners.forEach((callbacks, event) => {
            callbacks.forEach(callback => {
                this.socket?.on(event, callback);
            });
        });

        this.socket.on('connect', () => {
            console.log('[Socket] Connected:', this.socket?.id);
            this._isConnected = true;
            this._reconnectAttempts = 0;

            // Automatically re-join the current room if one was active
            if (this._currentRoomId) {
                console.log('[Socket] Internal: Re-joining persistent room:', this._currentRoomId);
                this.socket?.emit('join-room', this._currentRoomId);
            }
        });

        this.socket.on('disconnect', (reason) => {
            console.log('[Socket] Disconnected:', reason);
            this._isConnected = false;

            // If server disconnected us or network went down, try to reconnect
            if (reason === 'io server disconnect' || reason === 'transport close' || reason === 'ping timeout') {
                console.log('[Socket] Reconnectable failure detected, attempting reconnect...');
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

        // Handle pong/heartbeat from server if needed
        this.socket.on('pong', () => {
            // console.log('[Socket] Pong received');
        });
    }

    public joinRoom(roomId: string): void {
        this._currentRoomId = roomId;
        if (!this.socket) this.connect();

        if (this._isConnected) {
            this.socket?.emit('join-room', roomId);
        }
    }

    public leaveRoom(roomId: string): void {
        if (this._currentRoomId === roomId) {
            this._currentRoomId = null;
        }
        this.socket?.emit('leave-room', roomId);
    }

    public on(event: string, callback: (data: unknown) => void): void {
        if (!this._listeners.has(event)) {
            this._listeners.set(event, new Set());
        }
        this._listeners.get(event)?.add(callback);

        if (!this.socket) this.connect();
        this.socket?.on(event, callback);
    }

    public off(event: string, callback: (data: unknown) => void): void {
        this._listeners.get(event)?.delete(callback);
        this.socket?.off(event, callback);
    }

    /**
     * Remove all listeners for a specific event.
     * Use this when you don't have a reference to the original callback.
     */
    public removeAllListeners(event: string): void {
        // Prevent removing critical internal lifecycle listeners
        const protectedEvents = ['connect', 'disconnect', 'reconnect', 'reconnect_attempt', 'reconnect_error', 'connect_error'];
        if (protectedEvents.includes(event)) {
            console.warn(`[Socket] Blocked attempt to remove protected listener: ${event}`);
            return;
        }
        this._listeners.delete(event);
        this.socket?.removeAllListeners(event);
    }

    public disconnect(): void {
        this.socket?.disconnect();
        this.socket = null;
        this._isConnected = false;
        this._reconnectAttempts = 0;
        // Keep _listeners registry so they can be re-applied on next connect
        // unless we explicitly want them gone.
    }
}

export default SocketService.getInstance();

