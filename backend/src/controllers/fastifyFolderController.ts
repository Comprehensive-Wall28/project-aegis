import { FastifyReply } from 'fastify';
import { AuthRequest } from '../types/fastify';
import { withAuth } from '../middleware/fastifyControllerWrapper';
import { FolderService } from '../services';

const folderService = new FolderService();

export const getFolders = withAuth(async (request: AuthRequest, reply: FastifyReply) => {
    const query = request.query as any;
    const { parentId: rawParentId } = query;

    let parentId: string | null = null;
    let candidate = rawParentId;
    if (Array.isArray(rawParentId)) {
        candidate = rawParentId[0];
    }
    if (candidate && candidate !== 'null' && typeof candidate === 'string') {
        parentId = candidate;
    }

    const folders = await folderService.getFolders(request.user!.id, parentId);
    reply.status(200).send(folders);
});

export const getFolder = withAuth(async (request: AuthRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const folder = await folderService.getFolder(request.user!.id, id);
    reply.status(200).send(folder);
});

export const createFolder = withAuth(async (request: AuthRequest, reply: FastifyReply) => {
    const folder = await folderService.createFolder(request.user!.id, request.body as any);
    reply.status(201).send(folder);
});

export const renameFolder = withAuth(async (request: AuthRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const folder = await folderService.updateFolder(request.user!.id, id, request.body as any);
    reply.status(200).send(folder);
});

export const deleteFolder = withAuth(async (request: AuthRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    await folderService.deleteFolder(request.user!.id, id);
    reply.status(200).send({ message: 'Folder deleted successfully' });
});

export const moveFiles = withAuth(async (request: AuthRequest, reply: FastifyReply) => {
    const body = request.body as any;
    const { updates, folderId } = body;
    const modifiedCount = await folderService.moveFiles(request.user!.id, updates, folderId);

    reply.status(200).send({
        message: `Moved ${modifiedCount} file(s)`,
        modifiedCount
    });
});
