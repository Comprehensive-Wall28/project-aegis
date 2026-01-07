import { Router } from 'express';
import {
    getFolders,
    createFolder,
    renameFolder,
    deleteFolder,
    moveFiles,
} from '../controllers/folderController';
import { protect } from '../middleware/authMiddleware';

const router = Router();

// All routes require authentication
router.use(protect);

// File operations (must be before /:id routes to prevent matching 'move-files' as id)
router.put('/move-files', moveFiles);

// Folder CRUD
router.get('/', getFolders);
router.post('/', createFolder);
router.put('/:id', renameFolder);
router.delete('/:id', deleteFolder);

export default router;
