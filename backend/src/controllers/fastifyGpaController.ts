import { FastifyReply } from 'fastify';
import { AuthRequest } from '../types/fastify';
import { withAuth } from '../middleware/fastifyControllerWrapper';
import { GPAService } from '../services';

const gpaService = new GPAService();

export const getCourses = withAuth(async (request: AuthRequest, reply: FastifyReply) => {
    const courses = await gpaService.getCourses(request.user!.id);
    reply.status(200).send(courses);
});

export const createCourse = withAuth(async (request: AuthRequest, reply: FastifyReply) => {
    const course = await gpaService.createCourse(request.user!.id, request.body as any, request);
    reply.status(201).send(course);
});

export const deleteCourse = withAuth(async (request: AuthRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    await gpaService.deleteCourse(request.user!.id, id, request);
    reply.status(200).send({ message: 'Course deleted successfully' });
});

export const updatePreferences = withAuth(async (request: AuthRequest, reply: FastifyReply) => {
    const body = request.body as any;
    const result = await gpaService.updatePreferences(request.user!.id, body.gpaSystem, request);
    reply.status(200).send(result);
});

export const getPreferences = withAuth(async (request: AuthRequest, reply: FastifyReply) => {
    const result = await gpaService.getPreferences(request.user!.id);
    reply.status(200).send(result);
});

export const getUnmigratedCourses = withAuth(async (request: AuthRequest, reply: FastifyReply) => {
    const courses = await gpaService.getUnmigratedCourses(request.user!.id);
    reply.status(200).send(courses);
});

export const migrateCourse = withAuth(async (request: AuthRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const course = await gpaService.migrateCourse(request.user!.id, id, request.body as any);
    reply.status(200).send(course);
});
