import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

interface AuthRequest extends Request {
    user?: any;
}

export const protect = (req: AuthRequest, res: Response, next: NextFunction) => {
    let token: string | undefined;

    // Check for token in cookies (HTTP-only)
    if (req.cookies?.token) {
        token = req.cookies.token;
    }

    if (!token) {
        return res.status(401).json({ message: 'Not authorized, no token' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || '');
        req.user = decoded;
        next();
    } catch (error) {
        console.error(error);
        return res.status(401).json({ message: 'Not authorized, token failed' });
    }
};
