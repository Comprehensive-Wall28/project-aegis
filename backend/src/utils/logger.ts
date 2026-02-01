import winston from 'winston';
import MongoDBTransport from './MongoDBTransport';

const transports: winston.transport[] = [
    new winston.transports.Console({
        format: process.env.NODE_ENV === 'production'
            ? winston.format.json() // JSON for Render/Prod
            : winston.format.simple() // Readable for Dev
    })
];

// Add MongoDB transport for production (async, non-blocking)
if (process.env.NODE_ENV === 'production') {
    transports.push(new MongoDBTransport({
        level: 'warn', // Only warn and error
    }));
}

const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'warn' : 'info'),
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
    ),
    defaultMeta: { service: 'aegis-backend' },
    transports,
});

export default logger;
