import { Request, Response } from 'express';
import { CalendarService } from '../services';
import { withAuth } from '../middleware/controllerWrapper';

interface AuthRequest extends Request {
    user?: { id: string; username: string };
}

// Service instance
const calendarService = new CalendarService();

/**
 * Get all calendar events for the authenticated user.
 */
export const getEvents = withAuth(async (req: AuthRequest, res: Response) => {
    const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
    const cursor = req.query.cursor as string | undefined;

    if (limit !== undefined || cursor !== undefined) {
        const result = await calendarService.getPaginatedEvents(req.user!.id, { limit: limit || 50, cursor });
        return res.status(200).json(result);
    }

    const { start, end } = req.query;
    const events = await calendarService.getEvents(
        req.user!.id,
        start as string,
        end as string
    );
    res.status(200).json(events);
});

/**
 * Create a new encrypted calendar event.
 */
export const createEvent = withAuth(async (req: AuthRequest, res: Response) => {
    const event = await calendarService.createEvent(req.user!.id, req.body, req);
    res.status(201).json(event);
});

/**
 * Update an existing calendar event.
 */
export const updateEvent = withAuth(async (req: AuthRequest, res: Response) => {
    const event = await calendarService.updateEvent(
        req.user!.id,
        req.params.id as string,
        req.body,
        req
    );
    res.status(200).json(event);
});

/**
 * Delete a calendar event.
 */
export const deleteEvent = withAuth(async (req: AuthRequest, res: Response) => {
    await calendarService.deleteEvent(req.user!.id, req.params.id as string, req);
    res.status(200).json({ message: 'Event deleted successfully' });
});
