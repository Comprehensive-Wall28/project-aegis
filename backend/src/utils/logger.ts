import winston from 'winston';
import MongoDBTransport from './MongoDBTransport';

const transports: winston.transport[] = [
    new winston.transports.Console({
        format: process.env.NODE_ENV === 'production'
            ? winston.format.json() // JSON for Render/Prod
            : winston.format.simple() // Readable for Dev
    })
];

// Add MongoDB transport for all environments (async, non-blocking)
// Captures info, warn, error with performance metrics
transports.push(new MongoDBTransport({
    level: 'info', // Capture all info and above
}));

const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info', // Always use info level minimum
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
    ),
    defaultMeta: { service: 'aegis-backend' },
    transports,
});

export default logger;
