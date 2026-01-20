import DatabaseManager from './DatabaseManager';
import { config } from './env';
import logger from '../utils/logger';

const dbManager = DatabaseManager.getInstance();

// Initialize Primary
const primaryUri = config.mongoUri;
if (primaryUri) {
    dbManager.connect('primary', primaryUri);
} else {
    logger.error('MONGO_URI not set');
}

// Initialize Secondary
const secondaryUri = config.mongoUriSecondary;
if (secondaryUri) {
    dbManager.connect('secondary', secondaryUri);
} else {
    logger.warn('MONGO_URI_SECONDARY not set, logging functionality may fail or fallback needed');
}

export default dbManager;
