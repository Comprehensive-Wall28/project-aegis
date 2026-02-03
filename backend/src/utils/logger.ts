import winston from 'winston';
import Transport from 'winston-transport';
import { analyticsBuffer } from './analyticsBuffer';

/**
 * Custom Winston transport that writes to secondary analytics database
 * Fire-and-forget pattern for zero performance impact
 */
class AnalyticsTransport extends Transport {
    constructor(opts?: Transport.TransportStreamOptions) {
        super(opts);
    }

    log(info: any, callback: () => void): void {
        setImmediate(() => this.emit('logged', info));

        // Only log INFO, WARN, ERROR levels to analytics DB
        const level = info.level?.toUpperCase();
        if (level === 'INFO' || level === 'WARN' || level === 'ERROR') {
            // Queue to analytics buffer (fire and forget)
            analyticsBuffer.queueLog({
                level: level as 'INFO' | 'WARN' | 'ERROR',
                message: info.message || 'No message',
                source: info.source || info.service || 'unknown',
                metadata: {
                    ...info,
                    level: undefined,
                    message: undefined,
                    source: undefined,
                    service: undefined,
                    timestamp: undefined,
                },
                timestamp: new Date(),
                stackTrace: info.stack,
                userId: info.userId,
                requestId: info.requestId,
            });
        }

        callback();
    }
}

const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
    ),
    defaultMeta: { service: 'aegis-backend' },
    transports: [
        new winston.transports.Console({
            format: process.env.NODE_ENV === 'production'
                ? winston.format.json() // JSON for Render/Prod
                : winston.format.simple() // Readable for Dev
        }),
        new AnalyticsTransport(), // Write to secondary analytics database
    ],
});

export default logger;
