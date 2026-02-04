import { FastifyRequest, FastifyReply } from 'fastify';
import { CalendarService } from '../services';

// Service instance
const calendarService = new CalendarService();

/**
 * Get all calendar events for the authenticated user.
 */
export const getEvents = async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user as any;
    const userId = user?.id || user?._id;
    const query = request.query as Record<string, string>;
    const limit = query.limit ? parseInt(query.limit) : undefined;
    const cursor = query.cursor as string | undefined;

    if (limit !== undefined || cursor !== undefined) {
        const result = await calendarService.getPaginatedEvents(userId, { limit: limit || 50, cursor });
        return reply.code(200).send(result);
    }

    const { start, end } = query;
    const events = await calendarService.getEvents(
        userId,
        start as string,
        end as string
    );
    reply.code(200).send(events);
};

/**
 * Create a new encrypted calendar event.
 */
export const createEvent = async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user as any;
    const userId = user?.id || user?._id;
    const event = await calendarService.createEvent(userId, request.body as any, request as any);
    reply.code(201).send(event);
};

/**
 * Update an existing calendar event.
 */
export const updateEvent = async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user as any;
    const userId = user?.id || user?._id;
    const params = request.params as any;
    const event = await calendarService.updateEvent(
        userId,
        params.id,
        request.body as any,
        request as any
    );
    reply.code(200).send(event);
};

/**
 * Delete a calendar event.
 */
export const deleteEvent = async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user as any;
    const userId = user?.id || user?._id;
    const params = request.params as any;
    await calendarService.deleteEvent(userId, params.id, request as any);
    reply.code(200).send({ message: 'Event deleted successfully' });
};
