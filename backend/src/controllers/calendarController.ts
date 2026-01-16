import { Request, Response } from 'express';
import { CalendarService, ServiceError } from '../services';
import logger from '../utils/logger';

interface AuthRequest extends Request {
    user?: { id: string; username: string };
}

// Service instance
const calendarService = new CalendarService();

/**
 * Get all calendar events for the authenticated user.
 */
export const getEvents = async (req: AuthRequest, res: Response) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: 'Not authenticated' });
        }

        const { start, end } = req.query;
        const events = await calendarService.getEvents(
            req.user.id,
            start as string,
            end as string
        );
        res.status(200).json(events);
    } catch (error) {
        handleError(error, res);
    }
};

/**
 * Create a new encrypted calendar event.
 */
export const createEvent = async (req: AuthRequest, res: Response) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: 'Not authenticated' });
        }

        const event = await calendarService.createEvent(req.user.id, req.body, req);
        res.status(201).json(event);
    } catch (error) {
        handleError(error, res);
    }
};

/**
 * Update an existing calendar event.
 */
export const updateEvent = async (req: AuthRequest, res: Response) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: 'Not authenticated' });
        }

        const event = await calendarService.updateEvent(
            req.user.id,
            req.params.id,
            req.body,
            req
        );
        res.status(200).json(event);
    } catch (error) {
        handleError(error, res);
    }
};

/**
 * Delete a calendar event.
 */
export const deleteEvent = async (req: AuthRequest, res: Response) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: 'Not authenticated' });
        }

        await calendarService.deleteEvent(req.user.id, req.params.id, req);
        res.status(200).json({ message: 'Event deleted successfully' });
    } catch (error) {
        handleError(error, res);
    }
};

function handleError(error: unknown, res: Response): void {
    if (error instanceof ServiceError) {
        res.status(error.statusCode).json({ message: error.message });
        return;
    }
    logger.error('Controller error:', error);
    res.status(500).json({ message: 'Server error' });
}
