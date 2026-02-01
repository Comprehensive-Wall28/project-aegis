import DatabaseManager from './DatabaseManager';
import { config } from './env';
import logger from '../utils/logger';

const dbManager = DatabaseManager.getInstance();

// Initialize Primary
const primaryUri = config.mongoUri;
if (primaryUri) {
    console.log('🔌 Connecting to primary database...');
    dbManager.connect('primary', primaryUri);
} else {
    logger.error('MONGO_URI not set');
}

// Initialize Secondary
const secondaryUri = config.mongoUriSecondary;
if (secondaryUri) {
    console.log('🔌 Connecting to secondary database...');
    dbManager.connect('secondary', secondaryUri);
} else {
    console.log('⚠️  MONGO_URI_SECONDARY not set, using primary for all operations');
}

export default dbManager;
