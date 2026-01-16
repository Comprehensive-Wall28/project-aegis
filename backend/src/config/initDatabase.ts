import DatabaseManager from './DatabaseManager';
import dotenv from 'dotenv';
import logger from '../utils/logger';

// Ensure env vars are loaded if this is the entry point
dotenv.config();

const dbManager = DatabaseManager.getInstance();

// Initialize Primary
const primaryUri = process.env.MONGO_URI || '';
if (primaryUri) {
    dbManager.connect('primary', primaryUri);
} else {
    logger.error('MONGO_URI not set');
}

// Initialize Secondary
const secondaryUri = process.env.MONGO_URI_SECONDARY;
if (secondaryUri) {
    dbManager.connect('secondary', secondaryUri);
} else {
    console.warn('MONGO_URI_SECONDARY not set, logging functionality may fail or fallback needed');
}

export default dbManager;
