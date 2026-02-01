import { FastifyReply } from 'fastify';
import { AuthRequest } from '../types/fastify';
import { withAuth } from '../middleware/fastifyControllerWrapper';
import { NoteService, ServiceError } from '../services';
import { NoteMediaService } from '../services/NoteMediaService';
import logger from '../utils/logger';

const noteService = new NoteService();
const mediaService = new NoteMediaService();

/**
 * Get all notes for the authenticated user.
 * Supports filtering by tags and pagination.
 */
export const getNotes = withAuth(async (request: AuthRequest, reply: FastifyReply) => {
    const query = request.query as any;
    const limit = query.limit ? parseInt(query.limit) : undefined;
    const cursor = query.cursor as string | undefined;
    const tags = query.tags ? (query.tags as string).split(',') : undefined;
    const folderId = query.folderId as string | undefined;

    if (limit !== undefined || cursor !== undefined) {
        const result = await noteService.getNotesPaginated(request.user!.id, {
            limit: limit || 20,
            cursor,
            tags,
            folderId
        });
        return reply.status(200).send(result);
    }

    const notes = await noteService.getNotes(request.user!.id, {
        tags,
        subject: query.subject as string | undefined,
        semester: query.semester as string | undefined,
        folderId
    });

    reply.status(200).send(notes);
});

/**
 * Get a single note by ID (metadata only).
 */
export const getNote = withAuth(async (request: AuthRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const note = await noteService.getNote(request.user!.id, id);
    reply.status(200).send(note);
});

/**
 * Get note content (encrypted) from GridFS.
 * Returns base64-encoded encrypted content.
 */
export const getNoteContent = withAuth(async (request: AuthRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const { content, note } = await noteService.getNoteContentBuffer(request.user!.id, id);

    reply.status(200).send({
        encapsulatedKey: note.encapsulatedKey,
        encryptedSymmetricKey: note.encryptedSymmetricKey,
        encryptedContent: content.toString('base64'),
        contentSize: note.contentSize
    });
});

/**
 * Stream note content (for larger notes).
 * Returns raw binary encrypted content.
 */
export const getNoteContentStream = withAuth(async (request: AuthRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const { stream, note } = await noteService.getNoteContentStream(request.user!.id, id);

    reply.header('Content-Type', 'application/octet-stream');
    reply.header('Content-Length', note.contentSize.toString());
    reply.header('X-Encapsulated-Key', note.encapsulatedKey);
    reply.header('X-Encrypted-Symmetric-Key', note.encryptedSymmetricKey);

    return reply.send(stream);
});

/**
 * Create a new encrypted note.
 */
export const createNote = withAuth(async (request: AuthRequest, reply: FastifyReply) => {
    const note = await noteService.createNote(request.user!.id, request.body as any, request);
    reply.status(201).send(note);
});

/**
 * Update note metadata (tags, links, context).
 */
export const updateNoteMetadata = withAuth(async (request: AuthRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const note = await noteService.updateNoteMetadata(
        request.user!.id,
        id,
        request.body as any,
        request
    );

    reply.status(200).send(note);
});

/**
 * Update note content (creates new GridFS version).
 */
export const updateNoteContent = withAuth(async (request: AuthRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const note = await noteService.updateNoteContent(
        request.user!.id,
        id,
        request.body as any,
        request
    );

    reply.status(200).send(note);
});

/**
 * Delete a note and its content.
 */
export const deleteNote = withAuth(async (request: AuthRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    await noteService.deleteNote(request.user!.id, id, request);
    reply.status(200).send({ message: 'Note deleted successfully' });
});

/**
 * Get all unique tags for the user.
 */
export const getUserTags = withAuth(async (request: AuthRequest, reply: FastifyReply) => {
    const tags = await noteService.getUserTags(request.user!.id);
    reply.status(200).send(tags);
});

/**
 * Get notes that link to a specific entity (backlinks).
 */
export const getBacklinks = withAuth(async (request: AuthRequest, reply: FastifyReply) => {
    const { entityId } = request.params as { entityId: string };
    const notes = await noteService.getBacklinks(request.user!.id, entityId);
    reply.status(200).send(notes);
});

// ==================== FOLDER ENDPOINTS ====================

/**
 * Get all folders for the authenticated user.
 */
export const getFolders = withAuth(async (request: AuthRequest, reply: FastifyReply) => {
    const folders = await noteService.getFolders(request.user!.id);
    reply.status(200).send(folders);
});

/**
 * Create a new folder.
 */
export const createFolder = withAuth(async (request: AuthRequest, reply: FastifyReply) => {
    const folder = await noteService.createFolder(request.user!.id, request.body as any, request);
    reply.status(201).send(folder);
});

/**
 * Update a folder.
 */
export const updateFolder = withAuth(async (request: AuthRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const folder = await noteService.updateFolder(
        request.user!.id,
        id,
        request.body as any,
        request
    );

    reply.status(200).send(folder);
});

/**
 * Delete a folder (moves notes to root).
 */
export const deleteFolder = withAuth(async (request: AuthRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    await noteService.deleteFolder(request.user!.id, id, request);
    reply.status(200).send({ message: 'Folder deleted successfully' });
});

// ==================== MEDIA ENDPOINTS ====================

/**
 * Initialize a note media upload session
 */
export const uploadMediaInit = withAuth(async (request: AuthRequest, reply: FastifyReply) => {
    const result = await mediaService.initUpload(request.user!.id, request.body as any, request);
    reply.status(200).send(result);
});

/**
 * Upload a note media chunk
 */
export const uploadMediaChunk = withAuth(async (request: AuthRequest, reply: FastifyReply) => {
    const query = request.query as any;
    const mediaId = query.mediaId as string;
    const contentRange = request.headers['content-range'] as string;
    const contentLength = parseInt(request.headers['content-length'] || '0', 10);

    if (contentLength === 0) {
        throw new ServiceError('Missing Content-Length', 400);
    }

    const result = await mediaService.uploadChunk(
        request.user!.id,
        mediaId,
        contentRange,
        request.raw, // Pass the request stream directly
        contentLength
    );

    if (result.complete) {
        reply.status(200).send({
            message: 'Upload successful',
            complete: true
        });
    } else {
        reply.status(308).header('Range', `bytes=0-${result.receivedSize! - 1}`).send();
    }
});

/**
 * Download note media
 */
export const downloadMedia = withAuth(async (request: AuthRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const { stream, media } = await mediaService.getDownloadStream(
        request.user!.id,
        id
    );

    // Handle stream errors
    stream.on('error', (err) => {
        logger.error(`GridFS media stream error: ${err}`);
        if (!reply.sent) {
            reply.status(500).send({ message: 'Download failed' });
        }
    });

    reply.header('Content-Type', media.mimeType || 'application/octet-stream');
    reply.header('Content-Disposition', `attachment; filename="${media.originalFileName}"`);
    reply.header('Content-Length', media.fileSize.toString());
    reply.header('X-Encapsulated-Key', media.encapsulatedKey);
    reply.header('X-Encrypted-Symmetric-Key', media.encryptedSymmetricKey);

    return reply.send(stream);
});

/**
 * Get media metadata
 */
export const getMediaMetadata = withAuth(async (request: AuthRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const media = await mediaService.getMedia(request.user!.id, id);
    reply.send(media);
});
