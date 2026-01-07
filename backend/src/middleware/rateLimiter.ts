import rateLimit from 'express-rate-limit';

const API_RATE_LIMIT = parseInt(process.env.API_RATE_LIMIT || '500', 10);
const AUTH_RATE_LIMIT = parseInt(process.env.AUTH_RATE_LIMIT || '50', 10);

export const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: API_RATE_LIMIT,
    standardHeaders: true,
    legacyHeaders: false,
    message: 'Too many requests from this IP, please try again after 15 minutes'
});

export const authLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: AUTH_RATE_LIMIT,
    standardHeaders: true,
    legacyHeaders: false,
    message: 'Too many login attempts from this IP, please try again after an hour'
});
