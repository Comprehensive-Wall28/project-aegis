import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { promisify } from 'util';
import logger from '../utils/logger';
import { decryptToken } from '../utils/cryptoUtils';
import { config } from '../config/env';
import User from '../models/User';
import { AuthService } from '../services/AuthService';

const verifyJwt = promisify(jwt.verify) as any;
const authService = new AuthService();

interface AuthRequest extends Request {
    user?: any;
}

export const protect = async (req: AuthRequest, res: Response, next: NextFunction) => {
    let token: string | undefined;

    // Check for token in Authorization header (Bearer <token>)
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.split(' ')[1];
    }
    // Fallback to cookies (HTTP-only)
    else if (req.cookies?.token) {
        token = req.cookies.token;
    }

    if (!token) {
        return res.status(401).json({ message: 'Not authorized, no token' });
    }

    try {
        const decryptedToken = await decryptToken(token);
        const decoded = await verifyJwt(decryptedToken, config.jwtSecret);

        // Validate tokenVersion against database to ensure token hasn't been invalidated
        const user = await User.findById(decoded.id).select('tokenVersion').lean();
        if (!user) {
            return res.status(401).json({ message: 'Not authorized, user not found' });
        }

        // Check if token version matches (tokens before logout are invalid)
        const currentTokenVersion = user.tokenVersion || 0;
        const tokenVersion = decoded.tokenVersion ?? 0;
        if (tokenVersion !== currentTokenVersion) {
            logger.warn(`Token version mismatch for user ${decoded.id}: token=${tokenVersion}, current=${currentTokenVersion}`);
            return res.status(401).json({ message: 'Not authorized, token invalidated' });
        }

        req.user = decoded;

        // Sliding window: Refresh token if it's older than 1 hour
        // This ensures that active users always have a fresh 3-day session
        if (decoded.exp) {
            const expMs = decoded.exp * 1000;
            const nowMs = Date.now();
            const threeDaysMs = 3 * 24 * 60 * 60 * 1000;
            const refreshThresholdMs = threeDaysMs - (60 * 60 * 1000); // 3 days - 1 hour

            // If remaining time is less than threshold (meaning > 1 hour passed since issue)
            if (expMs - nowMs < refreshThresholdMs) {
                try {
                    // Generate new token with fresh 3-day expiry
                    const newToken = await authService.refreshToken(decoded.id);
                    
                    res.cookie('token', newToken, {
                        httpOnly: true,
                        secure: config.nodeEnv === 'production',
                        sameSite: config.nodeEnv === 'production' ? 'none' : 'lax',
                        maxAge: threeDaysMs,
                        path: '/',
                        partitioned: config.nodeEnv === 'production'
                    } as any);
                    
                    // Optional: Debug log
                    // logger.debug(`Refreshed session for user ${decoded.id}`);
                } catch (refreshError) {
                    logger.error('Failed to refresh session token:', refreshError);
                    // Continue without failing the request
                }
            }
        }

        next();
    } catch (error) {
        logger.error('Auth middleware error:', error);
        return res.status(401).json({ message: 'Not authorized, token failed' });
    }
};
