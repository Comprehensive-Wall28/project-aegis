import { FastifyReply } from 'fastify';
import { AuthRequest } from '../types/fastify';
import { withAuth, catchAsync } from '../middleware/fastifyControllerWrapper';
import {
    RoomService,
    CollectionService,
    LinkService,
    CommentService,
    ReaderService
} from '../services/social';

const roomService = new RoomService();
const collectionService = new CollectionService();
const linkService = new LinkService();
const commentService = new CommentService();
const readerService = new ReaderService();

// ============== Room Endpoints ==============

export const createRoom = withAuth(async (request: AuthRequest, reply: FastifyReply) => {
    const room = await roomService.createRoom(request.user!.id, request.body as any, request);
    reply.status(201).send(room);
});

export const getUserRooms = withAuth(async (request: AuthRequest, reply: FastifyReply) => {
    const rooms = await roomService.getUserRooms(request.user!.id);
    reply.status(200).send(rooms);
});

export const createInvite = withAuth(async (request: AuthRequest, reply: FastifyReply) => {
    const { roomId } = request.params as { roomId: string };
    const inviteCode = await roomService.createInvite(request.user!.id, roomId, request);
    reply.status(200).send({ inviteCode });
});

export const getInviteInfo = catchAsync(async (request: any, reply: FastifyReply) => {
    const { inviteCode } = request.params as { inviteCode: string };
    const info = await roomService.getInviteInfo(inviteCode);
    reply.status(200).send(info);
});

export const joinRoom = withAuth(async (request: AuthRequest, reply: FastifyReply) => {
    const body = request.body as any;
    const { inviteCode, encryptedRoomKey } = body;
    const roomId = await roomService.joinRoom(request.user!.id, inviteCode, encryptedRoomKey, request);
    reply.status(200).send({ message: 'Successfully joined room', roomId });
});

export const leaveRoom = withAuth(async (request: AuthRequest, reply: FastifyReply) => {
    const { roomId } = request.params as { roomId: string };
    await roomService.leaveRoom(request.user!.id, roomId, request);
    reply.status(200).send({ message: 'Successfully left room' });
});

export const deleteRoom = withAuth(async (request: AuthRequest, reply: FastifyReply) => {
    const { roomId } = request.params as { roomId: string };
    await roomService.deleteRoom(request.user!.id, roomId, request);
    reply.status(200).send({ message: 'Successfully deleted room' });
});

export const getRoomContent = withAuth(async (request: AuthRequest, reply: FastifyReply) => {
    const { roomId } = request.params as { roomId: string };
    const query = request.query as any;
    const collectionId = query.collectionId as string | undefined;
    const content = await roomService.getRoomContent(request.user!.id, roomId, collectionId);
    reply.status(200).send(content);
});

export const getCollectionLinks = withAuth(async (request: AuthRequest, reply: FastifyReply) => {
    const { roomId, collectionId } = request.params as { roomId: string; collectionId: string };
    const query = request.query as any;
    const cursorCreatedAt = query.cursorCreatedAt as string;
    const cursorId = query.cursorId as string;
    const limit = parseInt(query.limit as string) || 12;

    const beforeCursor = cursorCreatedAt && cursorId ? {
        createdAt: cursorCreatedAt,
        id: cursorId
    } : undefined;

    const result = await linkService.getCollectionLinks(
        request.user!.id,
        roomId,
        collectionId,
        limit,
        beforeCursor
    );
    reply.status(200).send(result);
});

export const searchRoomLinks = withAuth(async (request: AuthRequest, reply: FastifyReply) => {
    const { roomId } = request.params as { roomId: string };
    const query = request.query as any;
    const searchQuery = query.q as string;
    const limit = parseInt(query.limit as string) || 50;

    if (!searchQuery) {
        return reply.status(200).send({ links: [], viewedLinkIds: [], commentCounts: {} });
    }

    const result = await linkService.searchRoomLinks(
        request.user!.id,
        roomId,
        searchQuery,
        limit
    );
    reply.status(200).send(result);
});

// ============== Link Endpoints ==============

export const postLink = withAuth(async (request: AuthRequest, reply: FastifyReply) => {
    const { roomId } = request.params as { roomId: string };
    const linkPost = await linkService.postLink(request.user!.id, roomId, request.body as any, request);
    reply.status(201).send(linkPost);
});

export const deleteLink = withAuth(async (request: AuthRequest, reply: FastifyReply) => {
    const { linkId } = request.params as { linkId: string };
    await linkService.deleteLink(request.user!.id, linkId, request);
    reply.status(200).send({ message: 'Link deleted successfully' });
});

export const markLinkViewed = withAuth(async (request: AuthRequest, reply: FastifyReply) => {
    const { linkId } = request.params as { linkId: string };
    await linkService.markLinkViewed(request.user!.id, linkId);
    reply.status(200).send({ message: 'Link marked as viewed' });
});

export const unmarkLinkViewed = withAuth(async (request: AuthRequest, reply: FastifyReply) => {
    const { linkId } = request.params as { linkId: string };
    await linkService.unmarkLinkViewed(request.user!.id, linkId);
    reply.status(200).send({ message: 'Link unmarked as viewed' });
});

export const moveLink = withAuth(async (request: AuthRequest, reply: FastifyReply) => {
    const { linkId } = request.params as { linkId: string };
    const body = request.body as any;
    const linkPost = await linkService.moveLink(request.user!.id, linkId, body.collectionId, request);
    reply.status(200).send({ message: 'Link moved successfully', linkPost });
});

// ============== Collection Endpoints ==============

export const createCollection = withAuth(async (request: AuthRequest, reply: FastifyReply) => {
    const { roomId } = request.params as { roomId: string };
    const collection = await collectionService.createCollection(request.user!.id, roomId, request.body as any, request);
    reply.status(201).send(collection);
});

export const deleteCollection = withAuth(async (request: AuthRequest, reply: FastifyReply) => {
    const { collectionId } = request.params as { collectionId: string };
    await collectionService.deleteCollection(request.user!.id, collectionId, request);
    reply.status(200).send({ message: 'Collection deleted successfully' });
});

export const updateCollection = withAuth(async (request: AuthRequest, reply: FastifyReply) => {
    const { collectionId } = request.params as { collectionId: string };
    const body = request.body as any;
    const { name } = body;
    const collection = await collectionService.updateCollection(request.user!.id, collectionId, name, request);
    reply.status(200).send(collection);
});

export const reorderCollections = withAuth(async (request: AuthRequest, reply: FastifyReply) => {
    const { roomId } = request.params as { roomId: string };
    const body = request.body as any;
    const { collectionIds } = body;
    await collectionService.reorderCollections(request.user!.id, roomId, collectionIds, request);
    reply.status(200).send({ message: 'Collections reordered successfully' });
});

// ============== Comment Endpoints ==============

export const getComments = withAuth(async (request: AuthRequest, reply: FastifyReply) => {
    const { linkId } = request.params as { linkId: string };
    const query = request.query as any;
    const limit = parseInt(query.limit as string) || 20;
    const cursorCreatedAt = query.cursorCreatedAt as string;
    const cursorId = query.cursorId as string;

    const beforeCursor = cursorCreatedAt && cursorId ? {
        createdAt: cursorCreatedAt,
        id: cursorId
    } : undefined;

    const result = await commentService.getComments(
        request.user!.id,
        linkId,
        limit,
        beforeCursor
    );
    reply.status(200).send(result);
});

export const postComment = withAuth(async (request: AuthRequest, reply: FastifyReply) => {
    const { linkId } = request.params as { linkId: string };
    const body = request.body as any;
    const comment = await commentService.postComment(
        request.user!.id,
        linkId,
        body.encryptedContent,
        request
    );
    reply.status(201).send(comment);
});

export const deleteComment = withAuth(async (request: AuthRequest, reply: FastifyReply) => {
    const { commentId } = request.params as { commentId: string };
    await commentService.deleteComment(request.user!.id, commentId, request);
    reply.status(200).send({ message: 'Comment deleted successfully' });
});

// ============== Reader Mode Endpoints ==============

export const getReaderContent = withAuth(async (request: AuthRequest, reply: FastifyReply) => {
    const { linkId } = request.params as { linkId: string };
    const result = await readerService.getReaderContent(request.user!.id, linkId);
    reply.status(200).send(result);
});

export const getAnnotations = withAuth(async (request: AuthRequest, reply: FastifyReply) => {
    const { linkId } = request.params as { linkId: string };
    const annotations = await readerService.getAnnotations(request.user!.id, linkId);
    reply.status(200).send(annotations);
});

export const createAnnotation = withAuth(async (request: AuthRequest, reply: FastifyReply) => {
    const { linkId } = request.params as { linkId: string };
    const body = request.body as any;
    const { paragraphId, highlightText, encryptedContent } = body;
    const annotation = await readerService.createAnnotation(
        request.user!.id,
        linkId,
        paragraphId,
        highlightText,
        encryptedContent,
        request
    );
    reply.status(201).send(annotation);
});

export const deleteAnnotation = withAuth(async (request: AuthRequest, reply: FastifyReply) => {
    const { annotationId } = request.params as { annotationId: string };
    await readerService.deleteAnnotation(request.user!.id, annotationId, request);
    reply.status(200).send({ message: 'Annotation deleted successfully' });
});
