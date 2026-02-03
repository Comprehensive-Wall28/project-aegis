import mongoose from 'mongoose';
import type { IApiMetric } from '../models/ApiMetric';
import type { ILogEntry } from '../models/LogEntry';
import logger from './logger';

interface BufferedMetric {
    method: string;
    path: string;
    statusCode: number;
    durationMs: number;
    userId?: string;
    ipAddress: string;
    userAgent?: string;
    timestamp: Date;
    metadata?: Record<string, any>;
}

interface BufferedLog {
    level: 'INFO' | 'WARN' | 'ERROR';
    message: string;
    source: string;
    metadata?: Record<string, any>;
    timestamp: Date;
    stackTrace?: string;
    userId?: string;
    requestId?: string;
}

/**
 * High-performance analytics buffer
 * Uses in-memory ring buffer with batch flushing
 * Ensures zero impact on request latency
 */
class AnalyticsBuffer {
    private metricBuffer: BufferedMetric[] = [];
    private logBuffer: BufferedLog[] = [];
    private readonly MAX_BUFFER_SIZE = 100;
    private readonly FLUSH_INTERVAL_MS = 5000; // 5 seconds
    private flushTimer: NodeJS.Timeout | null = null;
    private isFlushing = false;

    // Dynamic imports for secondary DB models (loaded on first use)
    private apiMetricModel: any = null;
    private logEntryModel: any = null;

    constructor() {
        this.startFlushTimer();
    }

    /**
     * Add metric to buffer - fire and forget, never blocks
     */
    public queueMetric(metric: BufferedMetric): void {
        this.metricBuffer.push(metric);
        
        // Trigger immediate flush if buffer is full
        if (this.metricBuffer.length >= this.MAX_BUFFER_SIZE) {
            this.flushMetrics();
        }
    }

    /**
     * Add log to buffer - fire and forget, never blocks
     */
    public queueLog(log: BufferedLog): void {
        this.logBuffer.push(log);
        
        // Trigger immediate flush if buffer is full
        if (this.logBuffer.length >= this.MAX_BUFFER_SIZE) {
            this.flushLogs();
        }
    }

    /**
     * Start automatic flush timer
     */
    private startFlushTimer(): void {
        if (this.flushTimer) {
            clearInterval(this.flushTimer);
        }
        
        this.flushTimer = setInterval(() => {
            this.flushAll();
        }, this.FLUSH_INTERVAL_MS);
    }

    /**
     * Flush both metrics and logs
     */
    public async flushAll(): Promise<void> {
        await Promise.all([
            this.flushMetrics(),
            this.flushLogs(),
        ]);
    }

    /**
     * Flush metrics buffer to secondary database
     * Fire-and-forget pattern - never awaited in request path
     */
    private async flushMetrics(): Promise<void> {
        if (this.isFlushing || this.metricBuffer.length === 0) {
            return;
        }

        // Swap buffer atomically
        const batch = this.metricBuffer.splice(0, this.metricBuffer.length);

        try {
            this.isFlushing = true;
            const ApiMetric = await this.getApiMetricModel();
            
            if (!ApiMetric) {
                // Secondary DB not available - silently drop
                return;
            }

            // Bulk insert for maximum performance
            await ApiMetric.insertMany(batch, { ordered: false });
        } catch (error) {
            // Log error but don't throw - analytics must never break requests
            logger.error('Failed to flush metrics batch', { error, batchSize: batch.length });
        } finally {
            this.isFlushing = false;
        }
    }

    /**
     * Flush logs buffer to secondary database
     */
    private async flushLogs(): Promise<void> {
        if (this.isFlushing || this.logBuffer.length === 0) {
            return;
        }

        // Swap buffer atomically
        const batch = this.logBuffer.splice(0, this.logBuffer.length);

        try {
            this.isFlushing = true;
            const LogEntry = await this.getLogEntryModel();
            
            if (!LogEntry) {
                return;
            }

            await LogEntry.insertMany(batch, { ordered: false });
        } catch (error) {
            logger.error('Failed to flush logs batch', { error, batchSize: batch.length });
        } finally {
            this.isFlushing = false;
        }
    }

    /**
     * Lazy load ApiMetric model from secondary connection
     */
    private async getApiMetricModel(): Promise<any> {
        if (this.apiMetricModel) {
            return this.apiMetricModel;
        }

        try {
            const DatabaseManager = (await import('../config/DatabaseManager')).default;
            const secondaryConnection = DatabaseManager.getInstance().getConnection('secondary');
            
            if (!secondaryConnection) {
                return null;
            }

            const ApiMetricModule = await import('../models/ApiMetric');
            this.apiMetricModel = secondaryConnection.model(
                'ApiMetric',
                ApiMetricModule.default.schema
            );
            return this.apiMetricModel;
        } catch (error) {
            logger.warn('Secondary database not available for metrics', { error });
            return null;
        }
    }

    /**
     * Lazy load LogEntry model from secondary connection
     */
    private async getLogEntryModel(): Promise<any> {
        if (this.logEntryModel) {
            return this.logEntryModel;
        }

        try {
            const DatabaseManager = (await import('../config/DatabaseManager')).default;
            const secondaryConnection = DatabaseManager.getInstance().getConnection('secondary');
            
            if (!secondaryConnection) {
                return null;
            }

            const LogEntryModule = await import('../models/LogEntry');
            this.logEntryModel = secondaryConnection.model(
                'LogEntry',
                LogEntryModule.default.schema
            );
            return this.logEntryModel;
        } catch (error) {
            logger.warn('Secondary database not available for logs', { error });
            return null;
        }
    }

    /**
     * Graceful shutdown - flush remaining data
     */
    public async shutdown(): Promise<void> {
        if (this.flushTimer) {
            clearInterval(this.flushTimer);
            this.flushTimer = null;
        }
        await this.flushAll();
    }

    /**
     * Get current buffer sizes for monitoring
     */
    public getBufferStatus(): { metrics: number; logs: number } {
        return {
            metrics: this.metricBuffer.length,
            logs: this.logBuffer.length,
        };
    }
}

// Export singleton instance
export const analyticsBuffer = new AnalyticsBuffer();
export default analyticsBuffer;
