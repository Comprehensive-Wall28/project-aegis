import { Router } from 'express';
import {
    getTasks,
    createTask,
    updateTask,
    deleteTask,
    reorderTasks
} from '../controllers/taskController';
import { protect } from '../middleware/authMiddleware';
import { csrfProtection } from '../middleware/csrfMiddleware';

const router = Router();

// All routes require authentication and CSRF protection
router.use(protect);
router.use(csrfProtection);

// Task CRUD
router.get('/', getTasks);
router.post('/', createTask);
router.put('/reorder', reorderTasks);  // Must come before /:id to avoid route conflict
router.put('/:id', updateTask);
router.delete('/:id', deleteTask);

export default router;
