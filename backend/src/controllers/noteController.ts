import { FastifyRequest, FastifyReply } from 'fastify';
import { NoteService, ServiceError } from '../services';
import { NoteMediaService } from '../services/NoteMediaService';
import logger from '../utils/logger';

// Service instances
const noteService = new NoteService();
const mediaService = new NoteMediaService();

/**
 * Get all notes for the authenticated user.
 * Supports filtering by tags and pagination.
 */
export const getNotes = async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user as any;
    const userId = user?.id || user?._id;
    const query = request.query as Record<string, string>;
    const limit = query.limit ? parseInt(query.limit) : undefined;
    const cursor = query.cursor as string | undefined;
    const tags = query.tags ? query.tags.split(',') : undefined;
    const folderId = query.folderId as string | undefined;

    if (limit !== undefined || cursor !== undefined) {
        const result = await noteService.getNotesPaginated(userId, {
            limit: limit || 20,
            cursor,
            tags,
            folderId
        });
        return reply.code(200).send(result);
    }

    const notes = await noteService.getNotes(userId, {
        tags,
        subject: query.subject as string | undefined,
        semester: query.semester as string | undefined,
        folderId
    });

    reply.code(200).send(notes);
};

/**
 * Get a single note by ID (metadata only).
 */
export const getNote = async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user as any;
    const userId = user?.id || user?._id;
    const params = request.params as any;
    const note = await noteService.getNote(userId, params.id);
    reply.code(200).send(note);
};

/**
 * Get note content (encrypted) from GridFS.
 * Returns base64-encoded encrypted content.
 */
export const getNoteContent = async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user as any;
    const userId = user?.id || user?._id;
    const params = request.params as any;
    const { content, note } = await noteService.getNoteContentBuffer(userId, params.id);

    reply.code(200).send({
        encapsulatedKey: note.encapsulatedKey,
        encryptedSymmetricKey: note.encryptedSymmetricKey,
        encryptedContent: content.toString('base64'),
        contentSize: note.contentSize
    });
};

/**
 * Stream note content (for larger notes).
 * Returns raw binary encrypted content.
 */
export const getNoteContentStream = async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user as any;
    const userId = user?.id || user?._id;
    const params = request.params as any;
    const { stream, note } = await noteService.getNoteContentStream(userId, params.id);

    reply.header('Content-Type', 'application/octet-stream');
    reply.header('Content-Length', note.contentSize.toString());
    reply.header('X-Encapsulated-Key', note.encapsulatedKey);
    reply.header('X-Encrypted-Symmetric-Key', note.encryptedSymmetricKey);

    return reply.send(stream);
};

/**
 * Create a new encrypted note.
 */
export const createNote = async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user as any;
    const userId = user?.id || user?._id;
    const note = await noteService.createNote(userId, request.body as any, request as any);
    reply.code(201).send(note);
};

/**
 * Update note metadata (tags, links, context).
 */
export const updateNoteMetadata = async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user as any;
    const userId = user?.id || user?._id;
    const params = request.params as any;
    const note = await noteService.updateNoteMetadata(
        userId,
        params.id,
        request.body as any,
        request as any
    );

    reply.code(200).send(note);
};

/**
 * Update note content (creates new GridFS version).
 */
export const updateNoteContent = async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user as any;
    const userId = user?.id || user?._id;
    const params = request.params as any;
    const note = await noteService.updateNoteContent(
        userId,
        params.id,
        request.body as any,
        request as any
    );

    reply.code(200).send(note);
};

/**
 * Delete a note and its content.
 */
export const deleteNote = async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user as any;
    const userId = user?.id || user?._id;
    const params = request.params as any;
    await noteService.deleteNote(userId, params.id, request as any);
    reply.code(200).send({ message: 'Note deleted successfully' });
};

/**
 * Get all unique tags for the user.
 */
export const getUserTags = async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user as any;
    const userId = user?.id || user?._id;
    const tags = await noteService.getUserTags(userId);
    reply.code(200).send(tags);
};

/**
 * Get notes that link to a specific entity (backlinks).
 */
export const getBacklinks = async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user as any;
    const userId = user?.id || user?._id;
    const params = request.params as any;
    const notes = await noteService.getBacklinks(userId, params.entityId);
    reply.code(200).send(notes);
};

// ==================== FOLDER ENDPOINTS ====================

/**
 * Get all folders for the authenticated user.
 */
export const getFolders = async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user as any;
    const userId = user?.id || user?._id;
    const folders = await noteService.getFolders(userId);
    reply.code(200).send(folders);
};

/**
 * Create a new folder.
 */
export const createFolder = async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user as any;
    const userId = user?.id || user?._id;
    const folder = await noteService.createFolder(userId, request.body as any, request as any);
    reply.code(201).send(folder);
};

/**
 * Update a folder.
 */
export const updateFolder = async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user as any;
    const userId = user?.id || user?._id;
    const params = request.params as any;
    const folder = await noteService.updateFolder(
        userId,
        params.id,
        request.body as any,
        request as any
    );

    reply.code(200).send(folder);
};

/**
 * Delete a folder (moves notes to root).
 */
export const deleteFolder = async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user as any;
    const userId = user?.id || user?._id;
    const params = request.params as any;
    await noteService.deleteFolder(userId, params.id, request as any);
    reply.code(200).send({ message: 'Folder deleted successfully' });
};

// ==================== MEDIA ENDPOINTS ====================

/**
 * Initialize a note media upload session
 */
export const uploadMediaInit = async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user as any;
    const userId = user?.id || user?._id;
    const result = await mediaService.initUpload(userId, request.body as any, request as any);
    reply.code(200).send(result);
};

/**
 * Upload a note media chunk
 */
export const uploadMediaChunk = async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user as any;
    const userId = user?.id || user?._id;
    const query = request.query as Record<string, string>;
    const mediaId = query.mediaId;
    const contentRange = request.headers['content-range'] as string;
    const contentLength = parseInt(request.headers['content-length'] || '0', 10);

    if (contentLength === 0) {
        throw new ServiceError('Missing Content-Length', 400);
    }

    const result = await mediaService.uploadChunk(
        userId,
        mediaId,
        contentRange,
        request.raw, // Pass the request stream directly
        contentLength
    );

    if (result.complete) {
        reply.code(200).send({
            message: 'Upload successful',
            complete: true
        });
    } else {
        reply.code(308).header('Range', `bytes=0-${result.receivedSize! - 1}`).send();
    }
};

/**
 * Download note media
 */
export const downloadMedia = async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user as any;
    const userId = user?.id || user?._id;
    const params = request.params as any;
    const { stream, media } = await mediaService.getDownloadStream(
        userId,
        params.id
    );

    // Handle stream errors
    stream.on('error', (err) => {
        logger.error(`GridFS media stream error: ${err}`);
        if (!reply.sent) {
            reply.code(500).send({ message: 'Download failed' });
        }
    });

    reply.header('Content-Type', media.mimeType || 'application/octet-stream');
    reply.header('Content-Disposition', `attachment; filename="${media.originalFileName}"`);
    reply.header('Content-Length', media.fileSize.toString());
    reply.header('X-Encapsulated-Key', media.encapsulatedKey);
    reply.header('X-Encrypted-Symmetric-Key', media.encryptedSymmetricKey);

    return reply.send(stream);
};

/**
 * Get media metadata
 */
export const getMediaMetadata = async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user as any;
    const userId = user?.id || user?._id;
    const params = request.params as any;
    const media = await mediaService.getMedia(userId, params.id);
    reply.send(media);
};

