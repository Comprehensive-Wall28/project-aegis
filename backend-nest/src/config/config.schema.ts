import * as Joi from 'joi';

export const configSchema = Joi.object({
    // Server
    NODE_ENV: Joi.string()
        .valid('development', 'production', 'test')
        .default('development'),
    PORT: Joi.number().default(3001),

    // Database
    MONGO_URI: Joi.string().required(),
    MONGO_URI_SECONDARY: Joi.string().optional(),

    // Security
    JWT_SECRET: Joi.string().required(),
    COOKIE_ENCRYPTION_KEY: Joi.string().required(),
    CSRF_SECRET: Joi.string().required(),

    // Client
    FRONTEND_URL: Joi.string().required(),
    WEBAUTHN_RP_ID: Joi.string().default('localhost'),

    // Google Integration
    GOOGLE_CLIENT_ID: Joi.string().optional(),
    GOOGLE_CLIENT_SECRET: Joi.string().optional(),
    GOOGLE_REFRESH_TOKEN: Joi.string().optional(),
    GOOGLE_DRIVE_FOLDER_ID: Joi.string().optional(),

    // Logging
    LOG_LEVEL: Joi.string()
        .valid('error', 'warn', 'info', 'http', 'verbose', 'debug', 'silly')
        .default('info'),
});
