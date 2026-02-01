import { Request, Response, NextFunction } from 'express';
import { handleError } from '../utils/errors';

interface AuthRequest extends Request {
    user?: { id: string; username: string };
}

type ControllerFunction = (req: Request, res: Response, next: NextFunction) => Promise<any>;
type AuthControllerFunction = (req: AuthRequest, res: Response, next: NextFunction) => Promise<any>;

/**
 * Wraps an async controller with try-catch and standard error handling.
 */
export const catchAsync = (fn: ControllerFunction) => {
    return (req: Request, res: Response, next: NextFunction) => {
        fn(req, res, next).catch((err) => handleError(err, res));
    };
};

/**
 * Wraps an async controller that requires authentication.
 * Verifies req.user exists and provides try-catch error handling.
 */
export const withAuth = (fn: AuthControllerFunction) => {
    return (req: AuthRequest, res: Response, next: NextFunction) => {
        if (!req.user) {
            return res.status(401).json({ message: 'Not authenticated' });
        }
        fn(req, res, next).catch((err) => handleError(err, res));
    };
};
