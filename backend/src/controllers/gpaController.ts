import { Request, Response } from 'express';
import Course from '../models/Course';
import User from '../models/User';
import logger from '../utils/logger';

interface AuthRequest extends Request {
    user?: { id: string; username: string };
}

/**
 * Get all encrypted courses for the authenticated user.
 * Backend returns encrypted data as-is; decryption happens client-side.
 */
export const getCourses = async (req: AuthRequest, res: Response) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: 'Not authenticated' });
        }

        const courses = await Course.find({ userId: req.user.id }).sort({ createdAt: -1 });
        res.status(200).json(courses);
    } catch (error) {
        logger.error('Error fetching courses:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

/**
 * Create a new encrypted course.
 * Backend stores encrypted data without any validation of contents.
 */
export const createCourse = async (req: AuthRequest, res: Response) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: 'Not authenticated' });
        }

        const { encryptedData, encapsulatedKey, encryptedSymmetricKey } = req.body;

        if (!encryptedData || !encapsulatedKey || !encryptedSymmetricKey) {
            return res.status(400).json({
                message: 'Missing required fields: encryptedData, encapsulatedKey, encryptedSymmetricKey'
            });
        }

        const course = await Course.create({
            userId: req.user.id,
            encryptedData,
            encapsulatedKey,
            encryptedSymmetricKey,
        });

        logger.info(`Encrypted course created for user ${req.user.id}`);
        res.status(201).json(course);
    } catch (error) {
        logger.error('Error creating course:', error);
        res.status(500).json({ message: 'Server error' });
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

        const { id } = req.params;

        const course = await Course.findOneAndDelete({ _id: id, userId: req.user.id });
        if (!course) {
            return res.status(404).json({ message: 'Course not found' });
        }

        logger.info(`Course deleted for user ${req.user.id}`);
        res.status(200).json({ message: 'Course deleted successfully' });
    } catch (error) {
        logger.error('Error deleting course:', error);
        res.status(500).json({ message: 'Server error' });
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

        const { gpaSystem } = req.body;

        const normalizedGpaSystem = String(gpaSystem);

        if (!['NORMAL', 'GERMAN'].includes(normalizedGpaSystem)) {
            return res.status(400).json({ message: 'Invalid GPA system. Must be NORMAL or GERMAN' });
        }

        const user = await User.findByIdAndUpdate(
            req.user.id,
            { gpaSystem: normalizedGpaSystem },
            { new: true }
        );

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        logger.info(`GPA system preference updated for user ${req.user.id}: ${normalizedGpaSystem}`);
        res.status(200).json({ gpaSystem: user.gpaSystem });
    } catch (error) {
        logger.error('Error updating preferences:', error);
        res.status(500).json({ message: 'Server error' });
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

        const user = await User.findById(req.user.id).select('gpaSystem');

        res.status(200).json({
            gpaSystem: user?.gpaSystem || 'NORMAL',
        });
    } catch (error) {
        logger.error('Error fetching preferences:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

/**
 * Get unmigrated (plaintext) courses for client-side encryption migration.
 * Returns only courses that have the old plaintext format (name, grade, credits, semester).
 */
export const getUnmigratedCourses = async (req: AuthRequest, res: Response) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: 'Not authenticated' });
        }

        // Find courses that have plaintext fields but no encrypted data
        const unmigratedCourses = await Course.find({
            userId: req.user.id,
            name: { $exists: true, $ne: null },
            encryptedData: { $exists: false }
        }).sort({ createdAt: -1 });

        res.status(200).json(unmigratedCourses);
    } catch (error) {
        logger.error('Error fetching unmigrated courses:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

/**
 * Migrate a single course from plaintext to encrypted format.
 * Client sends encrypted data, backend updates the course and removes plaintext fields.
 */
export const migrateCourse = async (req: AuthRequest, res: Response) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: 'Not authenticated' });
        }

        const { id } = req.params;
        const { encryptedData, encapsulatedKey, encryptedSymmetricKey } = req.body;

        if (!encryptedData || !encapsulatedKey || !encryptedSymmetricKey) {
            return res.status(400).json({
                message: 'Missing required fields: encryptedData, encapsulatedKey, encryptedSymmetricKey'
            });
        }

        // Find the course and verify ownership
        const course = await Course.findOne({ _id: id, userId: req.user.id });
        if (!course) {
            return res.status(404).json({ message: 'Course not found' });
        }

        // Update with encrypted data and remove plaintext fields
        const updatedCourse = await Course.findByIdAndUpdate(
            id,
            {
                $set: {
                    encryptedData,
                    encapsulatedKey,
                    encryptedSymmetricKey,
                },
                $unset: {
                    name: 1,
                    grade: 1,
                    credits: 1,
                    semester: 1,
                }
            },
            { new: true }
        );

        logger.info(`Course ${id} migrated to encrypted format for user ${req.user.id}`);
        res.status(200).json(updatedCourse);
    } catch (error) {
        logger.error('Error migrating course:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

