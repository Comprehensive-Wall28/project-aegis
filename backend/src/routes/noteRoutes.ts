import { Router } from 'express';
import {
    getNotes,
    getNote,
    getNoteContent,
    getNoteContentStream,
    createNote,
    updateNoteMetadata,
    updateNoteContent,
    deleteNote,
    getUserTags,
    getBacklinks,
    getFolders,
    createFolder,
    updateFolder,
    deleteFolder,
    uploadMediaInit,
    uploadMediaChunk,
    downloadMedia,
    getMediaMetadata
} from '../controllers/noteController';
import { protect } from '../middleware/authMiddleware';
const router = Router();

// All routes require authentication
router.use(protect);

// Folder CRUD (must be before /:id routes to avoid conflicts)
router.get('/folders', getFolders);
router.post('/folders', createFolder);
router.put('/folders/:id', updateFolder);
router.delete('/folders/:id', deleteFolder);

// Note CRUD
router.get('/', getNotes);
router.get('/tags', getUserTags);  // Get all unique tags for the user
router.get('/backlinks/:entityId', getBacklinks);  // Get notes linking to an entity
router.get('/:id', getNote);
router.get('/:id/content', getNoteContent);  // Get content as base64 JSON
router.get('/:id/content/stream', getNoteContentStream);  // Stream raw content
router.post('/', createNote);
router.put('/:id/metadata', updateNoteMetadata);  // Update tags, links, context
router.put('/:id/content', updateNoteContent);  // Update encrypted content
router.delete('/:id', deleteNote);

// Note Media
router.post('/media/upload-init', uploadMediaInit);
router.put('/media/upload-chunk', uploadMediaChunk);
router.get('/media/download/:id', downloadMedia);
router.get('/media/metadata/:id', getMediaMetadata);

export default router;

