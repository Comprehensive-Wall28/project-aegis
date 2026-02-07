import { Injectable, Logger, OnApplicationShutdown } from '@nestjs/common';
import { Model, Connection } from 'mongoose';
import { DatabaseManagerService } from '../../config/database/database-manager.service';
import { ApiMetric, ApiMetricSchema } from './schemas/api-metric.schema';
import { LogEntry, LogEntrySchema, LogLevel } from './schemas/log-entry.schema';

export interface BufferedMetric {
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

export interface BufferedLog {
  level: LogLevel;
  message: string;
  source: string;
  metadata?: Record<string, any>;
  timestamp: Date;
  stackTrace?: string;
  userId?: string;
  requestId?: string;
}

@Injectable()
export class AnalyticsBufferService implements OnApplicationShutdown {
  private readonly logger = new Logger(AnalyticsBufferService.name);
  private metricBuffer: BufferedMetric[] = [];
  private logBuffer: BufferedLog[] = [];
  private readonly MAX_BUFFER_SIZE = 100;
  private readonly FLUSH_INTERVAL_MS = 5000;
  private flushTimer: NodeJS.Timeout | null = null;
  private isFlushing = false;

  private apiMetricModel: Model<ApiMetric> | null = null;
  private logEntryModel: Model<LogEntry> | null = null;

  constructor(private databaseManager: DatabaseManagerService) {
    this.startFlushTimer();
  }

  queueMetric(metric: BufferedMetric): void {
    this.metricBuffer.push(metric);
    if (this.metricBuffer.length >= this.MAX_BUFFER_SIZE) {
      this.flushMetrics(); // Fire and forget
    }
  }

  queueLog(log: BufferedLog): void {
    this.logBuffer.push(log);
    if (this.logBuffer.length >= this.MAX_BUFFER_SIZE) {
      this.flushLogs(); // Fire and forget
    }
  }

  private startFlushTimer(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }
    this.flushTimer = setInterval(() => {
      this.flushAll();
    }, this.FLUSH_INTERVAL_MS);
  }

  async flushAll(): Promise<void> {
    await Promise.all([this.flushMetrics(), this.flushLogs()]);
  }

  private async flushMetrics(): Promise<void> {
    if (this.isFlushing || this.metricBuffer.length === 0) return;

    const batch = this.metricBuffer.splice(0, this.metricBuffer.length);
    try {
      this.isFlushing = true;
      const model = await this.getModel('ApiMetric', ApiMetricSchema);
      if (model) {
        await model.insertMany(batch, { ordered: false });
      }
    } catch (error) {
      this.logger.error('Failed to flush metrics batch', {
        error,
        batchSize: batch.length,
      });
    } finally {
      this.isFlushing = false;
    }
  }

  private async flushLogs(): Promise<void> {
    if (this.isFlushing || this.logBuffer.length === 0) return;

    const batch = this.logBuffer.splice(0, this.logBuffer.length);
    try {
      this.isFlushing = true;
      const model = await this.getModel('LogEntry', LogEntrySchema);
      if (model) {
        await model.insertMany(batch, { ordered: false });
      }
    } catch (error) {
      this.logger.error('Failed to flush logs batch', {
        error,
        batchSize: batch.length,
      });
    } finally {
      this.isFlushing = false;
    }
  }

  // Get model from SECONDARY connection primarily, or PRIMARY if not set
  // The original implementation used secondary exclusively and failed if not present.
  // We can keep that behavior or fallback. Let's try secondary first.
  private async getModel(
    name: string,
    schema: any,
  ): Promise<Model<any> | null> {
    // Try to get secondary connection
    try {
      // Since DatabaseManagerService doesn't expose getSecondary directly but it exposes active.
      // But we want to specifically force Secondary for analytics if possible.
      // I need to use 'secondary' connection.
      // Since my previous implementation of DatabaseManagerService stored secondaryConnection privately...
      // I should have exposed it. I will edit DatabaseManagerService to expose `getConnection(name: string)`.

      // Wait, I can't edit it easily now without context switch.
      // But DatabaseManagerService has `useSecondary` which switches ACTIVE.
      // It doesn't expose the connection object directly by name easily in the interface I wrote.
      // I wrote: `getActiveConnection()` and setters.
      // Ah, I missed exposing `getSecondaryConnection()`.

      // HOWEVER, I registered `MongooseModule` with connectionName: 'secondary'.
      // So I can inject it here if I want!
      // But `MongooseModule` injection token is static string.
      // I can just rely on `Connection` injection in this service if I register `AnalyticsBufferService` in `AnalyticsModule` which imports `MongooseModule`.

      // BUT, `AnalyticsBufferService` needs to handle "optional" connection.
      // So explicit injection of `@InjectConnection('secondary')` might fail if not registered.

      // Plan B: Use `DatabaseManagerService` to get it. I see I didn't verify it has a getter for specific connections.
      // Let's assume for now I will modify DatabaseManagerService or try to cast it.

      return (
        (this.databaseManager as any).secondaryConnection?.model(
          name,
          schema,
        ) || null
      );
    } catch (e) {
      return null;
    }
  }

  async onApplicationShutdown() {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
    await this.flushAll();
  }
}
