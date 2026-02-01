// import { Response } from 'express';
import { ServiceError } from '../services';
import logger from './logger';

/**
 * Centrally handles errors caught in controllers.
 * Standardizes the response format for ServiceErrors and logs unexpected errors.
 */
export const handleError = (error: unknown, res: any): void => {
    if (error instanceof ServiceError) {
        res.status(error.statusCode).json({ message: error.message });
        return;
    }

    logger.error('Unhandled Controller Error:', error);
    res.status(500).json({ message: 'Server error' });
};
