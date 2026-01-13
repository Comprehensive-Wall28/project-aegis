import { Request, Response } from 'express';
import CalendarEvent from '../models/CalendarEvent';
import logger from '../utils/logger';
import { logAuditEvent } from '../utils/auditLogger';

interface AuthRequest extends Request {
    user?: { id: string; username: string };
}

/**
 * Get all calendar events for the authenticated user.
 * Supports date range filtering via query params: start and end (ISO strings).
 */
export const getEvents = async (req: AuthRequest, res: Response) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: 'Not authenticated' });
        }

        const { start, end } = req.query;
        const query: any = { userId: req.user.id };

        if (start || end) {
            query.startDate = {};
            if (start) query.startDate.$gte = new Date(start as string);
            if (end) query.startDate.$lte = new Date(end as string);
        }

        const events = await CalendarEvent.find(query).sort({ startDate: 1 });
        res.status(200).json(events);
    } catch (error) {
        logger.error('Error fetching calendar events:', error);
        res.status(500).json({ message: 'Server error' });
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

        const {
            encryptedData,
            encapsulatedKey,
            encryptedSymmetricKey,
            startDate,
            endDate,
            isAllDay,
            color,
            recordHash
        } = req.body;

        if (!encryptedData || !encapsulatedKey || !encryptedSymmetricKey || !startDate || !endDate || !recordHash) {
            return res.status(400).json({ message: 'Missing required fields' });
        }

        const event = await CalendarEvent.create({
            userId: req.user.id,
            encryptedData,
            encapsulatedKey,
            encryptedSymmetricKey,
            startDate: new Date(startDate),
            endDate: new Date(endDate),
            isAllDay: isAllDay || false,
            color: color || '#3f51b5',
            recordHash
        });

        logger.info(`Calendar event created for user ${req.user.id}`);

        // Log event creation
        await logAuditEvent(
            req.user.id,
            'CALENDAR_EVENT_CREATE',
            'SUCCESS',
            req,
            { eventId: event._id.toString() }
        );

        res.status(201).json(event);
    } catch (error) {
        logger.error('Error creating calendar event:', error);
        res.status(500).json({ message: 'Server error' });
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

        const { id } = req.params;
        const updateData = req.body;

        // Ensure we don't overwrite userId
        delete updateData.userId;

        const event = await CalendarEvent.findOneAndUpdate(
            { _id: { $eq: id }, userId: { $eq: req.user.id } },
            { $set: updateData },
            { new: true }
        );


        if (!event) {
            return res.status(404).json({ message: 'Event not found' });
        }

        logger.info(`Calendar event updated for user ${req.user.id}`);

        // Log event update
        await logAuditEvent(
            req.user.id,
            'CALENDAR_EVENT_UPDATE',
            'SUCCESS',
            req,
            { eventId: id }
        );

        res.status(200).json(event);
    } catch (error) {
        logger.error('Error updating calendar event:', error);
        res.status(500).json({ message: 'Server error' });
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

        const { id } = req.params;

        const event = await CalendarEvent.findOneAndDelete({
            _id: { $eq: id },
            userId: { $eq: req.user.id }
        });
        if (!event) {
            return res.status(404).json({ message: 'Event not found' });
        }

        logger.info(`Calendar event deleted for user ${req.user.id}`);

        // Log event deletion
        await logAuditEvent(
            req.user.id,
            'CALENDAR_EVENT_DELETE',
            'SUCCESS',
            req,
            { eventId: id }
        );

        res.status(200).json({ message: 'Event deleted successfully' });
    } catch (error) {
        logger.error('Error deleting calendar event:', error);
        res.status(500).json({ message: 'Server error' });
    }
};
