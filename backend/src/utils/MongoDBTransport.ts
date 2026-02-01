import Transport from 'winston-transport';


/**
 * Winston transport for writing logs to MongoDB (secondary database)
 * Non-blocking async implementation for zero performance impact
 */
class MongoDBTransport extends Transport {
    private queue: any[] = [];
    private isProcessing: boolean = false;
    private readonly BATCH_SIZE = 10;
    private readonly FLUSH_INTERVAL = 5000; // 5 seconds

    constructor(opts?: Transport.TransportStreamOptions) {
        super(opts);

        // Start background flush timer
        this.startFlushTimer();
    }

    /**
     * Log to MongoDB asynchronously (fire-and-forget)
     */
    log(info: any, callback: () => void): void {
        // Immediately return to not block
        setImmediate(() => callback());

        // Only log warn and error levels
        if (info.level !== 'warn' && info.level !== 'error') {
            return;
        }

        // Extract structured data
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
            'error', 'stack', 'Symbol(level)', 'Symbol(message)'
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
