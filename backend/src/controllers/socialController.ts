import { FastifyRequest, FastifyReply } from 'fastify';
import {
    RoomService,
    CollectionService,
    LinkService,
    CommentService,
    ReaderService
} from '../services/social';

// Service instances
const roomService = new RoomService();
const collectionService = new CollectionService();
const linkService = new LinkService();
const commentService = new CommentService();
const readerService = new ReaderService();

// ============== Room Endpoints ==============

export const createRoom = async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user as any;
    const userId = user?.id || user?._id;
    const room = await roomService.createRoom(userId, request.body as any, request as any);
    reply.code(201).send(room);
};

export const getUserRooms = async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user as any;
    const userId = user?.id || user?._id;
    const rooms = await roomService.getUserRooms(userId);
    reply.code(200).send(rooms);
};

export const createInvite = async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user as any;
    const userId = user?.id || user?._id;
    const params = request.params as any;
    const inviteCode = await roomService.createInvite(userId, params.roomId as string, request as any);
    reply.code(200).send({ inviteCode });
};

export const getInviteInfo = async (request: FastifyRequest, reply: FastifyReply) => {
    const params = request.params as any;
    const info = await roomService.getInviteInfo(params.inviteCode as string);
    reply.code(200).send(info);
};

export const joinRoom = async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user as any;
    const userId = user?.id || user?._id;
    const { inviteCode, encryptedRoomKey } = request.body as any;
    const roomId = await roomService.joinRoom(userId, inviteCode, encryptedRoomKey, request as any);
    reply.code(200).send({ message: 'Successfully joined room', roomId });
};

export const leaveRoom = async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user as any;
    const userId = user?.id || user?._id;
    const params = request.params as any;
    await roomService.leaveRoom(userId, params.roomId as string, request as any);
    reply.code(200).send({ message: 'Successfully left room' });
};

export const deleteRoom = async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user as any;
    const userId = user?.id || user?._id;
    const params = request.params as any;
    await roomService.deleteRoom(userId, params.roomId as string, request as any);
    reply.code(200).send({ message: 'Successfully deleted room' });
};

export const getRoomContent = async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user as any;
    const userId = user?.id || user?._id;
    const params = request.params as any;
    const query = request.query as Record<string, string>;
    const collectionId = query.collectionId as string | undefined;
    const content = await roomService.getRoomContent(userId, params.roomId as string, collectionId);
    reply.code(200).send(content);
};

export const getCollectionLinks = async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user as any;
    const userId = user?.id || user?._id;
    const params = request.params as any;
    const query = request.query as Record<string, string>;
    const cursorCreatedAt = query.cursorCreatedAt as string;
    const cursorId = query.cursorId as string;
    const limit = parseInt(query.limit as string) || 12;

    const beforeCursor = cursorCreatedAt && cursorId ? {
        createdAt: cursorCreatedAt,
        id: cursorId
    } : undefined;

    const result = await linkService.getCollectionLinks(
        userId,
        params.roomId as string,
        params.collectionId as string,
        limit,
        beforeCursor
    );
    reply.code(200).send(result);
};

export const searchRoomLinks = async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user as any;
    const userId = user?.id || user?._id;
    const params = request.params as any;
    const query = request.query as Record<string, string>;
    const searchQuery = query.q as string;
    const limit = parseInt(query.limit as string) || 50;

    if (!searchQuery) {
        return reply.code(200).send({ links: [], viewedLinkIds: [], commentCounts: {} });
    }

    const result = await linkService.searchRoomLinks(
        userId,
        params.roomId as string,
        searchQuery,
        limit
    );
    reply.code(200).send(result);
};

// ============== Link Endpoints ==============

export const postLink = async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user as any;
    const userId = user?.id || user?._id;
    const params = request.params as any;
    const linkPost = await linkService.postLink(userId, params.roomId as string, request.body as any, request as any);
    reply.code(201).send(linkPost);
};

export const deleteLink = async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user as any;
    const userId = user?.id || user?._id;
    const params = request.params as any;
    await linkService.deleteLink(userId, params.linkId as string, request as any);
    reply.code(200).send({ message: 'Link deleted successfully' });
};

export const markLinkViewed = async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user as any;
    const userId = user?.id || user?._id;
    const params = request.params as any;
    await linkService.markLinkViewed(userId, params.linkId as string);
    reply.code(200).send({ message: 'Link marked as viewed' });
};

export const unmarkLinkViewed = async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user as any;
    const userId = user?.id || user?._id;
    const params = request.params as any;
    await linkService.unmarkLinkViewed(userId, params.linkId as string);
    reply.code(200).send({ message: 'Link unmarked as viewed' });
};

export const moveLink = async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user as any;
    const userId = user?.id || user?._id;
    const params = request.params as any;
    const { collectionId } = request.body as any;
    const linkPost = await linkService.moveLink(userId, params.linkId as string, collectionId, request as any);
    reply.code(200).send({ message: 'Link moved successfully', linkPost });
};

// ============== Collection Endpoints ==============

export const createCollection = async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user as any;
    const userId = user?.id || user?._id;
    const params = request.params as any;
    const collection = await collectionService.createCollection(userId, params.roomId as string, request.body as any, request as any);
    reply.code(201).send(collection);
};

export const deleteCollection = async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user as any;
    const userId = user?.id || user?._id;
    const params = request.params as any;
    await collectionService.deleteCollection(userId, params.collectionId as string, request as any);
    reply.code(200).send({ message: 'Collection deleted successfully' });
};

export const updateCollection = async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user as any;
    const userId = user?.id || user?._id;
    const params = request.params as any;
    const { name } = request.body as any;
    const collection = await collectionService.updateCollection(userId, params.collectionId as string, name, request as any);
    reply.code(200).send(collection);
};

export const reorderCollections = async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user as any;
    const userId = user?.id || user?._id;
    const params = request.params as any;
    const { collectionIds } = request.body as any;
    await collectionService.reorderCollections(userId, params.roomId as string, collectionIds, request as any);
    reply.code(200).send({ message: 'Collections reordered successfully' });
};

// ============== Comment Endpoints ==============

export const getComments = async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user as any;
    const userId = user?.id || user?._id;
    const params = request.params as any;
    const query = request.query as Record<string, string>;
    const limit = parseInt(query.limit as string) || 20;
    const cursorCreatedAt = query.cursorCreatedAt as string;
    const cursorId = query.cursorId as string;

    const beforeCursor = cursorCreatedAt && cursorId ? {
        createdAt: cursorCreatedAt,
        id: cursorId
    } : undefined;

    const result = await commentService.getComments(
        userId,
        params.linkId as string,
        limit,
        beforeCursor
    );
    reply.code(200).send(result);
};

export const postComment = async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user as any;
    const userId = user?.id || user?._id;
    const params = request.params as any;
    const { encryptedContent } = request.body as any;
    const comment = await commentService.postComment(
        userId,
        params.linkId as string,
        encryptedContent,
        request as any
    );
    reply.code(201).send(comment);
};

export const deleteComment = async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user as any;
    const userId = user?.id || user?._id;
    const params = request.params as any;
    await commentService.deleteComment(userId, params.commentId as string, request as any);
    reply.code(200).send({ message: 'Comment deleted successfully' });
};

// ============== Reader Mode Endpoints ==============

export const getReaderContent = async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user as any;
    const userId = user?.id || user?._id;
    const params = request.params as any;
    const result = await readerService.getReaderContent(userId, params.linkId as string);
    reply.code(200).send(result);
};

export const getAnnotations = async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user as any;
    const userId = user?.id || user?._id;
    const params = request.params as any;
    const annotations = await readerService.getAnnotations(userId, params.linkId as string);
    reply.code(200).send(annotations);
};

export const createAnnotation = async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user as any;
    const userId = user?.id || user?._id;
    const params = request.params as any;
    const { paragraphId, highlightText, encryptedContent } = request.body as any;
    const annotation = await readerService.createAnnotation(
        userId,
        params.linkId as string,
        paragraphId,
        highlightText,
        encryptedContent,
        request as any
    );
    reply.code(201).send(annotation);
};

export const deleteAnnotation = async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user as any;
    const userId = user?.id || user?._id;
    const params = request.params as any;
    await readerService.deleteAnnotation(userId, params.annotationId as string, request as any);
    reply.code(200).send({ message: 'Annotation deleted successfully' });
};
