import Transport from 'winston-transport';

// TTL constants in milliseconds
const INFO_TTL_DAYS = 7;
const WARN_ERROR_TTL_DAYS = 30;

/**
 * Winston transport for writing logs to MongoDB (secondary database)
 * Non-blocking async implementation for zero performance impact
 * 
 * Captures all log levels (info, warn, error) with performance metrics
 * - Info logs: 7 day retention
 * - Warn/Error logs: 30 day retention
 */
class MongoDBTransport extends Transport {
    private queue: any[] = [];
    private isProcessing: boolean = false;
    private readonly BATCH_SIZE = 50;      // Increased for higher volume
    private readonly FLUSH_INTERVAL = 3000; // 3 seconds for faster writes

    constructor(opts?: Transport.TransportStreamOptions) {
        super(opts);

        // Start background flush timer
        this.startFlushTimer();
    }

    /**
     * Calculate expiration date based on log level
     */
    private calculateExpiresAt(level: string): Date {
        const now = Date.now();
        const ttlDays = level === 'info' ? INFO_TTL_DAYS : WARN_ERROR_TTL_DAYS;
        return new Date(now + ttlDays * 24 * 60 * 60 * 1000);
    }

    /**
     * Log to MongoDB asynchronously (fire-and-forget)
     */
    log(info: any, callback: () => void): void {
        // Immediately return to not block
        setImmediate(() => callback());

        // Accept info, warn, and error levels
        if (info.level !== 'info' && info.level !== 'warn' && info.level !== 'error') {
            return;
        }

        // Extract structured data including performance metrics
        const logEntry = {
            level: info.level,
            message: info.message,
            timestamp: new Date(info.timestamp || Date.now()),
            service: info.service || 'aegis-backend',
            method: info.method,
            url: info.url,
            userId: info.userId,
            statusCode: info.statusCode,
            error: info.error,
            stack: info.stack,
            // Performance metrics
            duration: info.duration,
            requestSize: info.requestSize,
            responseSize: info.responseSize,
            memoryUsage: info.memoryUsage,
            // TTL - computed based on level
            expiresAt: this.calculateExpiresAt(info.level),
            metadata: this.extractMetadata(info),
        };

        // Add to queue
        this.queue.push(logEntry);

        // Process queue if batch size reached (non-blocking)
        if (this.queue.length >= this.BATCH_SIZE) {
            this.processQueue();
        }
    }

    /**
     * Extract metadata while excluding known fields
     */
    private extractMetadata(info: any): Record<string, any> | undefined {
        const knownFields = new Set([
            'level', 'message', 'timestamp', 'service',
            'method', 'url', 'userId', 'statusCode',
            'error', 'stack', 'duration', 'requestSize',
            'responseSize', 'memoryUsage', 'expiresAt',
            'Symbol(level)', 'Symbol(message)'
        ]);

        const metadata: Record<string, any> = {};
        let hasMetadata = false;

        for (const [key, value] of Object.entries(info)) {
            if (!knownFields.has(key) && typeof key === 'string') {
                metadata[key] = value;
                hasMetadata = true;
            }
        }

        return hasMetadata ? metadata : undefined;
    }

    /**
     * Process queue in background (non-blocking)
     */
    private async processQueue(): Promise<void> {
        if (this.isProcessing || this.queue.length === 0) {
            return;
        }

        this.isProcessing = true;

        // Take batch from queue
        const batch = this.queue.splice(0, this.BATCH_SIZE);

        try {
            // Lazy load SystemLog model to avoid circular dependency
            // DatabaseManager -> logger -> MongoDBTransport -> SystemLog -> DatabaseManager
            const { default: SystemLog } = await import('../models/SystemLog');

            // Use insertMany for better performance
            await SystemLog.insertMany(batch, { ordered: false });
        } catch (error) {
            // Silently handle errors to not affect main application
            // Could emit to stderr if needed
            console.error('SystemLog write failed:', (error as Error).message);
        } finally {
            this.isProcessing = false;

            // Process remaining items if any
            if (this.queue.length > 0) {
                setImmediate(() => this.processQueue());
            }
        }
    }

    /**
     * Start periodic flush timer to ensure logs are written
     */
    private startFlushTimer(): void {
        setInterval(() => {
            if (this.queue.length > 0) {
                this.processQueue();
            }
        }, this.FLUSH_INTERVAL);
    }

    /**
     * Graceful shutdown - flush remaining logs
     */
    async flush(): Promise<void> {
        if (this.queue.length > 0) {
            await this.processQueue();
        }
    }
}

export default MongoDBTransport;
