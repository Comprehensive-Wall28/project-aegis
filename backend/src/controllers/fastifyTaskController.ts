import { FastifyReply } from 'fastify';
import { AuthRequest } from '../types/fastify';
import { withAuth } from '../middleware/fastifyControllerWrapper';
import { TaskService } from '../services';

const taskService = new TaskService();

export const getTasks = withAuth(async (request: AuthRequest, reply: FastifyReply) => {
    const query = request.query as any;
    const limit = query.limit ? parseInt(query.limit) : undefined;
    const cursor = query.cursor as string | undefined;

    if (limit !== undefined || cursor !== undefined) {
        const result = await taskService.getPaginatedTasks(request.user!.id, { limit: limit || 50, cursor });
        return reply.status(200).send(result);
    }

    const tasks = await taskService.getTasks(request.user!.id, {
        status: query.status as string | undefined,
        priority: query.priority as string | undefined
    });

    reply.status(200).send(tasks);
});

export const createTask = withAuth(async (request: AuthRequest, reply: FastifyReply) => {
    const task = await taskService.createTask(request.user!.id, request.body as any, request);
    reply.status(201).send(task);
});

export const updateTask = withAuth(async (request: AuthRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const task = await taskService.updateTask(request.user!.id, id, request.body as any, request);
    reply.status(200).send(task);
});

export const deleteTask = withAuth(async (request: AuthRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    await taskService.deleteTask(request.user!.id, id, request);
    reply.status(200).send({ message: 'Task deleted successfully' });
});

export const reorderTasks = withAuth(async (request: AuthRequest, reply: FastifyReply) => {
    const body = request.body as any;
    await taskService.reorderTasks(request.user!.id, body.updates, request);
    reply.status(200).send({ message: 'Tasks reordered successfully' });
});

export const getUpcomingTasks = withAuth(async (request: AuthRequest, reply: FastifyReply) => {
    const query = request.query as any;
    const limit = query.limit ? parseInt(query.limit) : 10;
    const tasks = await taskService.getUpcomingTasks(request.user!.id, limit);
    reply.status(200).send(tasks);
});
