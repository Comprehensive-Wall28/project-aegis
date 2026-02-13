import { Request, Response } from 'express';
import { GPAService } from '../services';
import { withAuth } from '../middleware/controllerWrapper';

interface AuthRequest extends Request {
    user?: { id: string; username: string };
}

// Service instance
const gpaService = new GPAService();

/**
 * Get all encrypted courses for the authenticated user.
 */
export const getCourses = withAuth(async (req: AuthRequest, res: Response) => {
    const courses = await gpaService.getCourses(req.user!.id);
    res.status(200).json(courses);
});

/**
 * Create a new encrypted course.
 */
export const createCourse = withAuth(async (req: AuthRequest, res: Response) => {
    const course = await gpaService.createCourse(req.user!.id, req.body, req);
    res.status(201).json(course);
});

/**
 * Delete a course.
 */
export const deleteCourse = withAuth(async (req: AuthRequest, res: Response) => {
    await gpaService.deleteCourse(req.user!.id, req.params.id as string, req);
    res.status(200).json({ message: 'Course deleted successfully' });
});

/**
 * Update user's GPA system preference.
 */
export const updatePreferences = withAuth(async (req: AuthRequest, res: Response) => {
    const result = await gpaService.updatePreferences(req.user!.id, req.body.gpaSystem, req);
    res.status(200).json(result);
});

/**
 * Get user's current preferences.
 */
export const getPreferences = withAuth(async (req: AuthRequest, res: Response) => {
    const result = await gpaService.getPreferences(req.user!.id);
    res.status(200).json(result);
});
