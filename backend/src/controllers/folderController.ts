import { FastifyRequest, FastifyReply } from 'fastify';
import { FolderService } from '../services';

// Service instance
const folderService = new FolderService();

/**
 * Get all folders for the authenticated user in a specific parent folder.
 */
export const getFolders = async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user as any;
    const userId = user?.id || user?._id;
    const query = request.query as Record<string, string | string[]>;
    const { parentId: rawParentId } = query;

    // Normalize rawParentId
    let parentId: string | null = null;
    let candidate = rawParentId;
    if (Array.isArray(rawParentId)) {
        candidate = rawParentId[0];
    }
    if (candidate && candidate !== 'null' && typeof candidate === 'string') {
        parentId = candidate;
    }

    const folders = await folderService.getFolders(userId, parentId);
    reply.code(200).send(folders);
};

/**
 * Get a single folder by ID.
 */
export const getFolder = async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user as any;
    const userId = user?.id || user?._id;
    const params = request.params as any;
    const folder = await folderService.getFolder(userId, params.id);
    reply.code(200).send(folder);
};

/**
 * Create a new folder.
 */
export const createFolder = async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user as any;
    const userId = user?.id || user?._id;
    const folder = await folderService.createFolder(userId, request.body as any);
    reply.code(201).send(folder);
};

/**
 * Update a folder (rename and/or change color).
 */
export const renameFolder = async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user as any;
    const userId = user?.id || user?._id;
    const params = request.params as any;
    const folder = await folderService.updateFolder(
        userId,
        params.id,
        request.body as any
    );
    reply.code(200).send(folder);
};

/**
 * Delete a folder (only if empty).
 */
export const deleteFolder = async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user as any;
    const userId = user?.id || user?._id;
    const params = request.params as any;
    await folderService.deleteFolder(userId, params.id);
    reply.code(200).send({ message: 'Folder deleted successfully' });
};

/**
 * Move files to a folder (supports bulk move).
 */
export const moveFiles = async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user as any;
    const userId = user?.id || user?._id;
    const body = request.body as any;
    const { updates, folderId } = body;
    const modifiedCount = await folderService.moveFiles(userId, updates, folderId);

    reply.code(200).send({
        message: `Moved ${modifiedCount} file(s)`,
        modifiedCount
    });
};
