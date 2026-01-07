import { Request, Response } from 'express';
import Course from '../models/Course';
import User from '../models/User';
import CryptoJS from 'crypto-js';
import logger from '../utils/logger';

interface AuthRequest extends Request {
    user?: { id: string; username: string };
}

/**
 * Generates a SHA256 hash for a course record.
 */
const generateCourseHash = (course: {
    name: string;
    grade: number;
    credits: number;
    semester: string;
    userId: string;
}): string => {
    const data = `${course.userId}:${course.semester}:${course.name}:${course.grade}:${course.credits}`;
    return CryptoJS.SHA256(data).toString();
};

/**
 * Academic half-up rounding (standard in most universities)
 */
const roundHalfUp = (value: number, decimals: number = 2): number => {
    const multiplier = Math.pow(10, decimals);
    return Math.round((value + Number.EPSILON) * multiplier) / multiplier;
};

/**
 * Calculate GPA using Normal 4.0 scale.
 * Formula: Sum(Grade × Credits) / Sum(Credits)
 */
const calculateNormalGPA = (courses: Array<{ grade: number; credits: number }>): number => {
    if (courses.length === 0) return 0;
    const totalPoints = courses.reduce((sum, c) => sum + (c.grade * c.credits), 0);
    const totalCredits = courses.reduce((sum, c) => sum + c.credits, 0);
    const gpa = totalCredits > 0 ? totalPoints / totalCredits : 0;
    return roundHalfUp(gpa, 2);
};

/**
 * Calculate GPA using German Modified Bavarian Formula.
 * Formula: 1 + 3 × (Nmax - Nd) / (Nmax - Nmin)
 * Where Nmax = 1.0 (best), Nmin = 4.0 (lowest pass), Nd = achieved grade
 */
const calculateGermanGPA = (
    courses: Array<{ grade: number; credits: number }>,
    nMax: number = 1.0,
    nMin: number = 4.0
): number => {
    if (courses.length === 0) return 0;

    // Weight grades by credits first
    const totalPoints = courses.reduce((sum, c) => sum + (c.grade * c.credits), 0);
    const totalCredits = courses.reduce((sum, c) => sum + c.credits, 0);
    const weightedGrade = totalCredits > 0 ? totalPoints / totalCredits : 0;

    // Apply Bavarian formula
    const gpa = 1 + (3 * (nMax - weightedGrade) / (nMax - nMin));
    return roundHalfUp(Math.max(1.0, Math.min(4.0, gpa)), 2); // Clamp between 1.0 and 4.0
};

/**
 * Parse semester string into sortable components.
 */
const parseSemester = (semester: string): { year: number; seasonOrder: number } => {
    const parts = semester.split(' ');
    const season = parts[0]?.toLowerCase() || '';
    const year = parseInt(parts[1] || '0', 10);

    const seasonMap: Record<string, number> = {
        winter: 0,
        spring: 1,
        summer: 2,
        fall: 3,
    };

    return { year, seasonOrder: seasonMap[season] ?? 0 };
};

/**
 * Sort semesters chronologically (oldest to newest).
 */
const sortSemestersChronologically = (semesters: string[]): string[] => {
    return [...semesters].sort((a, b) => {
        const parsedA = parseSemester(a);
        const parsedB = parseSemester(b);

        if (parsedA.year !== parsedB.year) {
            return parsedA.year - parsedB.year;
        }
        return parsedA.seasonOrder - parsedB.seasonOrder;
    });
};

/**
 * Get all courses for the authenticated user.
 */
export const getCourses = async (req: AuthRequest, res: Response) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: 'Not authenticated' });
        }

        const courses = await Course.find({ userId: req.user.id }).sort({ semester: -1, name: 1 });
        res.status(200).json(courses);
    } catch (error) {
        logger.error('Error fetching courses:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

/**
 * Create a new course.
 */
export const createCourse = async (req: AuthRequest, res: Response) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: 'Not authenticated' });
        }

        const { name, grade, credits, semester } = req.body;

        if (!name || grade === undefined || !credits || !semester) {
            return res.status(400).json({ message: 'Missing required fields: name, grade, credits, semester' });
        }

        // Validate grade range
        if (grade < 0 || grade > 5) {
            return res.status(400).json({ message: 'Grade must be between 0 and 5' });
        }

        // Validate credits
        if (credits <= 0) {
            return res.status(400).json({ message: 'Credits must be greater than 0' });
        }

        // Generate integrity hash
        const recordHash = generateCourseHash({
            name,
            grade,
            credits,
            semester,
            userId: req.user.id,
        });

        const course = await Course.create({
            userId: req.user.id,
            name,
            grade,
            credits,
            semester,
            recordHash,
        });

        logger.info(`Course created for user ${req.user.id}: ${name} (${semester})`);
        res.status(201).json(course);
    } catch (error) {
        logger.error('Error creating course:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

/**
 * Update an existing course.
 */
export const updateCourse = async (req: AuthRequest, res: Response) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: 'Not authenticated' });
        }

        const { id } = req.params;
        const { name, grade, credits, semester } = req.body;

        const course = await Course.findOne({ _id: id, userId: req.user.id });
        if (!course) {
            return res.status(404).json({ message: 'Course not found' });
        }

        // Update fields
        if (name !== undefined) course.name = name;
        if (grade !== undefined) {
            if (grade < 0 || grade > 5) {
                return res.status(400).json({ message: 'Grade must be between 0 and 5' });
            }
            course.grade = grade;
        }
        if (credits !== undefined) {
            if (credits <= 0) {
                return res.status(400).json({ message: 'Credits must be greater than 0' });
            }
            course.credits = credits;
        }
        if (semester !== undefined) course.semester = semester;

        // Regenerate hash
        course.recordHash = generateCourseHash({
            name: course.name,
            grade: course.grade,
            credits: course.credits,
            semester: course.semester,
            userId: req.user.id,
        });

        await course.save();

        logger.info(`Course updated for user ${req.user.id}: ${course.name} (${course.semester})`);
        res.status(200).json(course);
    } catch (error) {
        logger.error('Error updating course:', error);
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

        logger.info(`Course deleted for user ${req.user.id}: ${course.name} (${course.semester})`);
        res.status(200).json({ message: 'Course deleted successfully' });
    } catch (error) {
        logger.error('Error deleting course:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

/**
 * Get calculated GPA for the user.
 */
export const getCalculatedGPA = async (req: AuthRequest, res: Response) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: 'Not authenticated' });
        }

        // Get user's GPA system preference
        const user = await User.findById(req.user.id);
        const gpaSystem = user?.gpaSystem || 'NORMAL';

        // Get all courses
        const courses = await Course.find({ userId: req.user.id });

        // Calculate GPA based on system
        let cumulativeGPA: number;
        if (gpaSystem === 'GERMAN') {
            cumulativeGPA = calculateGermanGPA(courses);
        } else {
            cumulativeGPA = calculateNormalGPA(courses);
        }

        // Calculate per-semester GPAs
        const semesters = sortSemestersChronologically([...new Set(courses.map(c => c.semester))]);
        const semesterGPAs = semesters.map(semester => {
            const semCourses = courses.filter(c => c.semester === semester);
            const gpa = gpaSystem === 'GERMAN'
                ? calculateGermanGPA(semCourses)
                : calculateNormalGPA(semCourses);
            return { semester, gpa, courseCount: semCourses.length };
        });

        // Calculate cumulative GPA progression
        const cumulativeProgression: Array<{ semester: string; cumulativeGPA: number }> = [];
        let runningCourses: Array<{ grade: number; credits: number }> = [];
        for (const semester of semesters) {
            runningCourses = [
                ...runningCourses,
                ...courses.filter(c => c.semester === semester).map(c => ({
                    grade: c.grade,
                    credits: c.credits,
                })),
            ];
            const cumGPA = gpaSystem === 'GERMAN'
                ? calculateGermanGPA(runningCourses)
                : calculateNormalGPA(runningCourses);
            cumulativeProgression.push({ semester, cumulativeGPA: cumGPA });
        }

        res.status(200).json({
            gpaSystem,
            cumulativeGPA,
            totalCourses: courses.length,
            totalCredits: courses.reduce((sum, c) => sum + c.credits, 0),
            semesterGPAs,
            cumulativeProgression,
        });
    } catch (error) {
        logger.error('Error calculating GPA:', error);
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

        if (!gpaSystem || !['NORMAL', 'GERMAN'].includes(gpaSystem)) {
            return res.status(400).json({ message: 'Invalid GPA system. Must be NORMAL or GERMAN' });
        }

        const user = await User.findByIdAndUpdate(
            req.user.id,
            { gpaSystem },
            { new: true }
        );

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        logger.info(`GPA system preference updated for user ${req.user.id}: ${gpaSystem}`);
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
