import { Request, Response } from 'express';
import { GPAService, ServiceError } from '../services';
import logger from '../utils/logger';

interface AuthRequest extends Request {
    user?: { id: string; username: string };
}

// Service instance
const gpaService = new GPAService();

/**
 * Get all encrypted courses for the authenticated user.
 */
export const getCourses = async (req: AuthRequest, res: Response) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: 'Not authenticated' });
        }
        const courses = await gpaService.getCourses(req.user.id);
        res.status(200).json(courses);
    } catch (error) {
        handleError(error, res);
    }
};

/**
 * Create a new encrypted course.
 */
export const createCourse = async (req: AuthRequest, res: Response) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: 'Not authenticated' });
        }
        const course = await gpaService.createCourse(req.user.id, req.body, req);
        res.status(201).json(course);
    } catch (error) {
        handleError(error, res);
    }
};

/**
 * Delete a course.
 */
export const deleteCourse = async (req: AuthRequest, res: Response) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: 'Not authenticated' });
        }
        await gpaService.deleteCourse(req.user.id, req.params.id, req);
        res.status(200).json({ message: 'Course deleted successfully' });
    } catch (error) {
        handleError(error, res);
    }
};

/**
 * Update user's GPA system preference.
 */
export const updatePreferences = async (req: AuthRequest, res: Response) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: 'Not authenticated' });
        }
        const result = await gpaService.updatePreferences(req.user.id, req.body.gpaSystem, req);
        res.status(200).json(result);
    } catch (error) {
        handleError(error, res);
    }
};

/**
 * Get user's current preferences.
 */
export const getPreferences = async (req: AuthRequest, res: Response) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: 'Not authenticated' });
        }
        const result = await gpaService.getPreferences(req.user.id);
        res.status(200).json(result);
    } catch (error) {
        handleError(error, res);
    }
};

/**
 * Get unmigrated (plaintext) courses for client-side encryption migration.
 */
export const getUnmigratedCourses = async (req: AuthRequest, res: Response) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: 'Not authenticated' });
        }
        const courses = await gpaService.getUnmigratedCourses(req.user.id);
        res.status(200).json(courses);
    } catch (error) {
        handleError(error, res);
    }
};

/**
 * Migrate a single course from plaintext to encrypted format.
 */
export const migrateCourse = async (req: AuthRequest, res: Response) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: 'Not authenticated' });
        }
        const course = await gpaService.migrateCourse(req.user.id, req.params.id, req.body);
        res.status(200).json(course);
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
