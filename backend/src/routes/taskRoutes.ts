import { Router } from 'express';
import {
    getTasks,
    createTask,
    updateTask,
    deleteTask,
    reorderTasks,
    getUpcomingTasks
} from '../controllers/taskController';
import { protect } from '../middleware/authMiddleware';
const router = Router();

// All routes require authentication
router.use(protect);

// Task CRUD
router.get('/', getTasks);
router.get('/upcoming', getUpcomingTasks);  // Lightweight endpoint for dashboard widget
router.post('/', createTask);
router.put('/reorder', reorderTasks);  // Must come before /:id to avoid route conflict
router.put('/:id', updateTask);
router.delete('/:id', deleteTask);

export default router;

