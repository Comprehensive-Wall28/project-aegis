import { Router } from 'express';
import {
    getCourses,
    createCourse,
    updateCourse,
    deleteCourse,
    getCalculatedGPA,
    updatePreferences,
    getPreferences,
} from '../controllers/gpaController';
import { protect } from '../middleware/authMiddleware';

const router = Router();

// All routes require authentication
router.use(protect);

// Course CRUD
router.get('/courses', getCourses);
router.post('/courses', createCourse);
router.put('/courses/:id', updateCourse);
router.delete('/courses/:id', deleteCourse);

// GPA Calculation
router.get('/calculate', getCalculatedGPA);

// User Preferences
router.get('/preferences', getPreferences);
router.put('/preferences', updatePreferences);

export default router;
