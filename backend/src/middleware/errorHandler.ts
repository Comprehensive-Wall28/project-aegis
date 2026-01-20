import { Request, Response, NextFunction } from 'express';
import { config } from '../config/env';

export const errorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
    // If the response status is still 200, it means it wasn't set by the controller/middleware.
    // We should use the error's status code if available, otherwise default to 500.
    let statusCode = res.statusCode === 200 ? 500 : res.statusCode;

    // Check for specific error status codes
    if (err.status) statusCode = err.status;
    if (err.statusCode) statusCode = err.statusCode;
    if (err.code === 'EBADCSRFTOKEN') statusCode = 403;

    res.status(statusCode);

    res.json({
        message: err.message,
        stack: config.nodeEnv === 'production' ? null : err.stack,
    });
};
