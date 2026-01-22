import { Request, Response } from 'express';
import { NoteService, ServiceError } from '../services';
import logger from '../utils/logger';

interface AuthRequest extends Request {
    user?: { id: string; username: string };
}

// Service instance
const noteService = new NoteService();

/**
 * Get all notes for the authenticated user.
 * Supports filtering by tags and pagination.
 */
export const getNotes = async (req: AuthRequest, res: Response) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: 'Not authenticated' });
        }

        const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
        const cursor = req.query.cursor as string | undefined;
        const tags = req.query.tags ? (req.query.tags as string).split(',') : undefined;

        if (limit !== undefined || cursor !== undefined) {
            const result = await noteService.getNotesPaginated(req.user.id, {
                limit: limit || 20,
                cursor,
                tags
            });
            return res.status(200).json(result);
        }

        const notes = await noteService.getNotes(req.user.id, {
            tags,
            subject: req.query.subject as string | undefined,
            semester: req.query.semester as string | undefined
        });

        res.status(200).json(notes);
    } catch (error) {
        handleError(error, res);
    }
};

/**
 * Get a single note by ID (metadata only).
 */
export const getNote = async (req: AuthRequest, res: Response) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: 'Not authenticated' });
        }

        const note = await noteService.getNote(req.user.id, req.params.id);
        res.status(200).json(note);
    } catch (error) {
        handleError(error, res);
    }
};

/**
 * Get note content (encrypted) from GridFS.
 * Returns base64-encoded encrypted content.
 */
export const getNoteContent = async (req: AuthRequest, res: Response) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: 'Not authenticated' });
        }

        const { content, note } = await noteService.getNoteContentBuffer(req.user.id, req.params.id);

        res.status(200).json({
            encapsulatedKey: note.encapsulatedKey,
            encryptedSymmetricKey: note.encryptedSymmetricKey,
            encryptedContent: content.toString('base64'),
            contentSize: note.contentSize
        });
    } catch (error) {
        handleError(error, res);
    }
};

/**
 * Stream note content (for larger notes).
 * Returns raw binary encrypted content.
 */
export const getNoteContentStream = async (req: AuthRequest, res: Response) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: 'Not authenticated' });
        }

        const { stream, note } = await noteService.getNoteContentStream(req.user.id, req.params.id);

        res.setHeader('Content-Type', 'application/octet-stream');
        res.setHeader('Content-Length', note.contentSize.toString());
        res.setHeader('X-Encapsulated-Key', note.encapsulatedKey);
        res.setHeader('X-Encrypted-Symmetric-Key', note.encryptedSymmetricKey);

        stream.pipe(res);
    } catch (error) {
        handleError(error, res);
    }
};

/**
 * Create a new encrypted note.
 */
export const createNote = async (req: AuthRequest, res: Response) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: 'Not authenticated' });
        }

        const note = await noteService.createNote(req.user.id, req.body, req);
        res.status(201).json(note);
    } catch (error) {
        handleError(error, res);
    }
};

/**
 * Update note metadata (tags, links, context).
 */
export const updateNoteMetadata = async (req: AuthRequest, res: Response) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: 'Not authenticated' });
        }

        const note = await noteService.updateNoteMetadata(
            req.user.id,
            req.params.id,
            req.body,
            req
        );

        res.status(200).json(note);
    } catch (error) {
        handleError(error, res);
    }
};

/**
 * Update note content (creates new GridFS version).
 */
export const updateNoteContent = async (req: AuthRequest, res: Response) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: 'Not authenticated' });
        }

        const note = await noteService.updateNoteContent(
            req.user.id,
            req.params.id,
            req.body,
            req
        );

        res.status(200).json(note);
    } catch (error) {
        handleError(error, res);
    }
};

/**
 * Delete a note and its content.
 */
export const deleteNote = async (req: AuthRequest, res: Response) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: 'Not authenticated' });
        }

        await noteService.deleteNote(req.user.id, req.params.id, req);
        res.status(200).json({ message: 'Note deleted successfully' });
    } catch (error) {
        handleError(error, res);
    }
};

/**
 * Get all unique tags for the user.
 */
export const getUserTags = async (req: AuthRequest, res: Response) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: 'Not authenticated' });
        }

        const tags = await noteService.getUserTags(req.user.id);
        res.status(200).json(tags);
    } catch (error) {
        handleError(error, res);
    }
};

/**
 * Get notes that link to a specific entity (backlinks).
 */
export const getBacklinks = async (req: AuthRequest, res: Response) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: 'Not authenticated' });
        }

        const notes = await noteService.getBacklinks(req.user.id, req.params.entityId);
        res.status(200).json(notes);
    } catch (error) {
        handleError(error, res);
    }
};

/**
 * Handle service errors and convert to HTTP responses
 */
function handleError(error: unknown, res: Response): void {
    if (error instanceof ServiceError) {
        res.status(error.statusCode).json({ message: error.message });
        return;
    }

    logger.error('Controller error:', error);
    res.status(500).json({ message: 'Server error' });
}
