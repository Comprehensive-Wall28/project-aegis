import rateLimit from 'express-rate-limit';
import { config } from '../config/env';

const API_RATE_LIMIT = config.apiRateLimit;
const AUTH_RATE_LIMIT = config.authRateLimit;

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
