import { FastifyRequest, FastifyReply } from 'fastify';
import { GPAService } from '../services';

// Service instance
const gpaService = new GPAService();

/**
 * Get all encrypted courses for the authenticated user.
 */
export const getCourses = async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user as any;
    const userId = user?.id || user?._id;
    const courses = await gpaService.getCourses(userId);
    reply.code(200).send(courses);
};

/**
 * Create a new encrypted course.
 */
export const createCourse = async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user as any;
    const userId = user?.id || user?._id;
    const course = await gpaService.createCourse(userId, request.body as any, request as any);
    reply.code(201).send(course);
};

/**
 * Delete a course.
 */
export const deleteCourse = async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user as any;
    const userId = user?.id || user?._id;
    const params = request.params as any;
    await gpaService.deleteCourse(userId, params.id, request as any);
    reply.code(200).send({ message: 'Course deleted successfully' });
};

/**
 * Update user's GPA system preference.
 */
export const updatePreferences = async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user as any;
    const userId = user?.id || user?._id;
    const body = request.body as any;
    const result = await gpaService.updatePreferences(userId, body.gpaSystem, request as any);
    reply.code(200).send(result);
};

/**
 * Get user's current preferences.
 */
export const getPreferences = async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user as any;
    const userId = user?.id || user?._id;
    const result = await gpaService.getPreferences(userId);
    reply.code(200).send(result);
};

/**
 * Get unmigrated (plaintext) courses for client-side encryption migration.
 */
export const getUnmigratedCourses = async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user as any;
    const userId = user?.id || user?._id;
    const courses = await gpaService.getUnmigratedCourses(userId);
    reply.code(200).send(courses);
};

/**
 * Migrate a single course from plaintext to encrypted format.
 */
export const migrateCourse = async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user as any;
    const userId = user?.id || user?._id;
    const params = request.params as any;
    const course = await gpaService.migrateCourse(userId, params.id, request.body as any);
    reply.code(200).send(course);
};
