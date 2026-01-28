import { Request, Response, NextFunction } from 'express';
import { SocialService } from '../services';
import { withAuth, catchAsync } from '../middleware/controllerWrapper';

interface AuthRequest extends Request {
    user?: { id: string; username: string };
}

// Service instance
const socialService = new SocialService();

// ============== Room Endpoints ==============

export const createRoom = withAuth(async (req: AuthRequest, res: Response) => {
    const room = await socialService.createRoom(req.user!.id, req.body, req);
    res.status(201).json(room);
});

export const getUserRooms = withAuth(async (req: AuthRequest, res: Response) => {
    const rooms = await socialService.getUserRooms(req.user!.id);
    res.status(200).json(rooms);
});

export const createInvite = withAuth(async (req: AuthRequest, res: Response) => {
    const inviteCode = await socialService.createInvite(req.user!.id, req.params.roomId as string, req);
    res.status(200).json({ inviteCode });
});

export const getInviteInfo = catchAsync(async (req: Request, res: Response) => {
    const info = await socialService.getInviteInfo(req.params.inviteCode as string);
    res.status(200).json(info);
});

export const joinRoom = withAuth(async (req: AuthRequest, res: Response) => {
    const { inviteCode, encryptedRoomKey } = req.body;
    const roomId = await socialService.joinRoom(req.user!.id, inviteCode, encryptedRoomKey, req);
    res.status(200).json({ message: 'Successfully joined room', roomId });
});

export const getRoomContent = withAuth(async (req: AuthRequest, res: Response) => {
    const content = await socialService.getRoomContent(req.user!.id, req.params.roomId as string);
    res.status(200).json(content);
});

export const getCollectionLinks = withAuth(async (req: AuthRequest, res: Response) => {
    const cursorCreatedAt = req.query.cursorCreatedAt as string;
    const cursorId = req.query.cursorId as string;
    const limit = parseInt(req.query.limit as string) || 12;

    const beforeCursor = cursorCreatedAt && cursorId ? {
        createdAt: cursorCreatedAt,
        id: cursorId
    } : undefined;

    const result = await socialService.getCollectionLinks(
        req.user!.id,
        req.params.roomId as string,
        req.params.collectionId as string,
        limit,
        beforeCursor
    );
    res.status(200).json(result);
});

export const searchRoomLinks = withAuth(async (req: AuthRequest, res: Response) => {
    const query = req.query.q as string;
    const limit = parseInt(req.query.limit as string) || 50;

    if (!query) {
        return res.status(200).json({ links: [], viewedLinkIds: [], commentCounts: {} });
    }

    const result = await socialService.searchRoomLinks(
        req.user!.id,
        req.params.roomId as string,
        query,
        limit
    );
    res.status(200).json(result);
});

// ============== Link Endpoints ==============

export const postLink = withAuth(async (req: AuthRequest, res: Response) => {
    const linkPost = await socialService.postLink(req.user!.id, req.params.roomId as string, req.body, req);
    res.status(201).json(linkPost);
});

export const deleteLink = withAuth(async (req: AuthRequest, res: Response) => {
    await socialService.deleteLink(req.user!.id, req.params.linkId as string, req);
    res.status(200).json({ message: 'Link deleted successfully' });
});

export const markLinkViewed = withAuth(async (req: AuthRequest, res: Response) => {
    await socialService.markLinkViewed(req.user!.id, req.params.linkId as string);
    res.status(200).json({ message: 'Link marked as viewed' });
});

export const unmarkLinkViewed = withAuth(async (req: AuthRequest, res: Response) => {
    await socialService.unmarkLinkViewed(req.user!.id, req.params.linkId as string);
    res.status(200).json({ message: 'Link unmarked as viewed' });
});

export const moveLink = withAuth(async (req: AuthRequest, res: Response) => {
    const linkPost = await socialService.moveLink(req.user!.id, req.params.linkId as string, req.body.collectionId);
    res.status(200).json({ message: 'Link moved successfully', linkPost });
});

// ============== Collection Endpoints ==============

export const createCollection = withAuth(async (req: AuthRequest, res: Response) => {
    const collection = await socialService.createCollection(req.user!.id, req.params.roomId as string, req.body);
    res.status(201).json(collection);
});

export const deleteCollection = withAuth(async (req: AuthRequest, res: Response) => {
    await socialService.deleteCollection(req.user!.id, req.params.collectionId as string, req);
    res.status(200).json({ message: 'Collection deleted successfully' });
});

export const reorderCollections = withAuth(async (req: AuthRequest, res: Response) => {
    const { roomId } = req.params;
    const { collectionIds } = req.body;
    await socialService.reorderCollections(req.user!.id, roomId as string, collectionIds);
    res.status(200).json({ message: 'Collections reordered successfully' });
});

// ============== Comment Endpoints ==============

export const getComments = withAuth(async (req: AuthRequest, res: Response) => {
    const limit = parseInt(req.query.limit as string) || 20;
    const cursorCreatedAt = req.query.cursorCreatedAt as string;
    const cursorId = req.query.cursorId as string;

    const beforeCursor = cursorCreatedAt && cursorId ? {
        createdAt: cursorCreatedAt,
        id: cursorId
    } : undefined;

    const result = await socialService.getComments(
        req.user!.id,
        req.params.linkId as string,
        limit,
        beforeCursor
    );
    res.status(200).json(result);
});

export const postComment = withAuth(async (req: AuthRequest, res: Response) => {
    const comment = await socialService.postComment(
        req.user!.id,
        req.params.linkId as string,
        req.body.encryptedContent
    );
    res.status(201).json(comment);
});

export const deleteComment = withAuth(async (req: AuthRequest, res: Response) => {
    await socialService.deleteComment(req.user!.id, req.params.commentId as string);
    res.status(200).json({ message: 'Comment deleted successfully' });
});

// ============== Reader Mode Endpoints ==============

export const getReaderContent = withAuth(async (req: AuthRequest, res: Response) => {
    const result = await socialService.getReaderContent(req.user!.id, req.params.linkId as string);
    res.status(200).json(result);
});

export const getAnnotations = withAuth(async (req: AuthRequest, res: Response) => {
    const annotations = await socialService.getAnnotations(req.user!.id, req.params.linkId as string);
    res.status(200).json(annotations);
});

export const createAnnotation = withAuth(async (req: AuthRequest, res: Response) => {
    const { paragraphId, highlightText, encryptedContent } = req.body;
    const annotation = await socialService.createAnnotation(
        req.user!.id,
        req.params.linkId as string,
        paragraphId,
        highlightText,
        encryptedContent
    );
    res.status(201).json(annotation);
});

export const deleteAnnotation = withAuth(async (req: AuthRequest, res: Response) => {
    await socialService.deleteAnnotation(req.user!.id, req.params.annotationId as string);
    res.status(200).json({ message: 'Annotation deleted successfully' });
});
