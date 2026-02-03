import { Router } from 'express';
import {
    getCourses,
    createCourse,
    deleteCourse,
    updatePreferences,
    getPreferences,
    getUnmigratedCourses,
    migrateCourse,
} from '../controllers/gpaController';
import { protect } from '../middleware/authMiddleware';
const router = Router();

// All routes require authentication
router.use(protect);

// Course CRUD (encrypted data only)
router.get('/courses', getCourses);
router.post('/courses', createCourse);
router.delete('/courses/:id', deleteCourse);

// Migration endpoints
router.get('/courses/unmigrated', getUnmigratedCourses);
router.put('/courses/:id/migrate', migrateCourse);

// User Preferences
router.get('/preferences', getPreferences);
router.put('/preferences', updatePreferences);

export default router;
