import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { decryptToken } from '../utils/cryptoUtils';
import { config } from '../config/env';

interface AuthRequest extends Request {
    user?: any;
}

export const protect = (req: AuthRequest, res: Response, next: NextFunction) => {
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
        const decryptedToken = decryptToken(token);
        const decoded = jwt.verify(decryptedToken, config.jwtSecret);
        req.user = decoded;
        next();
    } catch (error) {
        console.error('Auth middleware error:', error);
        return res.status(401).json({ message: 'Not authorized, token failed' });
    }
};
