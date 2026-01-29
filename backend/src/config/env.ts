import dotenv from 'dotenv';
import logger from '../utils/logger';

// Load environment variables
dotenv.config();

/**
 * Validates that all required environment variables are present in production.
 * In development, provides sensible defaults but warns when missing.
 */
const getEnv = (key: string, required = false, fallback = ''): string => {
    const value = process.env[key];

    if (!value) {
        if (required && process.env.NODE_ENV === 'production') {
            const msg = `CRITICAL ERROR: Environment variable ${key} is required but missing.`;
            logger.error(msg);
            throw new Error(msg);
        }

        if (required) {
            logger.warn(`WARNING: Missing required environment variable ${key}. Using fallback: ${fallback}`);
        }
        return fallback;
    }

    return value;
};

export const config = {
    nodeEnv: process.env.NODE_ENV || 'development',
    port: parseInt(process.env.PORT || '5000', 10),

    // Database
    mongoUri: getEnv('MONGO_URI', true, 'mongodb://localhost:27017/aegis'),
    mongoUriSecondary: getEnv('MONGO_URI_SECONDARY', false, ''),

    // Auth & Security
    jwtSecret: getEnv('JWT_SECRET', true, 'dev-secret-keep-it-safe'),
    cookieEncryptionKey: getEnv('COOKIE_ENCRYPTION_KEY', false, ''), // Falls back to jwtSecret in cryptoUtils if empty

    // WebAuthn
    clientOrigin: getEnv('CLIENT_ORIGIN', true, 'http://localhost:5173'),
    rpId: getEnv('RP_ID', true, 'localhost'),

    // Rate Limiting
    apiRateLimit: parseInt(getEnv('API_RATE_LIMIT', false, '500'), 10),
    authRateLimit: parseInt(getEnv('AUTH_RATE_LIMIT', false, '50'), 10),

    // Google Drive / API
    googleClientId: getEnv('GOOGLE_CLIENT_ID', false, ''),
    googleClientSecret: getEnv('GOOGLE_CLIENT_SECRET', false, ''),
    googleRefreshToken: getEnv('GOOGLE_REFRESH_TOKEN', false, ''),
    googleDriveFolderId: getEnv('GOOGLE_DRIVE_FOLDER_ID', false, ''),

    // CSRF
    csrfSecret: getEnv('CSRF_SECRET', true),
};

/**
 * Validate critical configuration on startup
 */
export const validateConfig = () => {
    const isProd = config.nodeEnv === 'production';
    const missing: string[] = [];

    if (isProd) {
        if (!process.env.JWT_SECRET) missing.push('JWT_SECRET');
        if (!process.env.MONGO_URI) missing.push('MONGO_URI');
        if (!process.env.CLIENT_ORIGIN) missing.push('CLIENT_ORIGIN');
        if (!process.env.RP_ID) missing.push('RP_ID');
        if (!process.env.CSRF_SECRET) missing.push('CSRF_SECRET');
    }

    if (missing.length > 0) {
        const msg = `FATAL: Missing required environment variables for production: ${missing.join(', ')}`;
        logger.error(msg);
        process.exit(1);
    }
};
