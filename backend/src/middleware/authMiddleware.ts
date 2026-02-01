import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { promisify } from 'util';
import logger from '../utils/logger';
import { decryptToken } from '../utils/cryptoUtils';
import { config } from '../config/env';
import User from '../models/User';

const verifyJwt = promisify(jwt.verify) as any;

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
        next();
    } catch (error) {
        logger.error('Auth middleware error:', error);
        return res.status(401).json({ message: 'Not authorized, token failed' });
    }
};
