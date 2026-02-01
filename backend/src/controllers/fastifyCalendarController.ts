import { FastifyReply } from 'fastify';
import { AuthRequest } from '../types/fastify';
import { withAuth } from '../middleware/fastifyControllerWrapper';
import { CalendarService } from '../services';

const calendarService = new CalendarService();

export const getEvents = withAuth(async (request: AuthRequest, reply: FastifyReply) => {
    const query = request.query as any;
    const limit = query.limit ? parseInt(query.limit) : undefined;
    const cursor = query.cursor as string | undefined;

    if (limit !== undefined || cursor !== undefined) {
        const result = await calendarService.getPaginatedEvents(request.user!.id, { limit: limit || 50, cursor });
        return reply.status(200).send(result);
    }

    const { start, end } = query;
    const events = await calendarService.getEvents(request.user!.id, start as string, end as string);
    reply.status(200).send(events);
});

export const createEvent = withAuth(async (request: AuthRequest, reply: FastifyReply) => {
    const event = await calendarService.createEvent(request.user!.id, request.body as any, request);
    reply.status(201).send(event);
});

export const updateEvent = withAuth(async (request: AuthRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const event = await calendarService.updateEvent(request.user!.id, id, request.body as any, request);
    reply.status(200).send(event);
});

export const deleteEvent = withAuth(async (request: AuthRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    await calendarService.deleteEvent(request.user!.id, id, request);
    reply.status(200).send({ message: 'Event deleted successfully' });
});
