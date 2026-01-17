import { Request, Response, NextFunction } from 'express';
import { SocialService, ServiceError } from '../services';
import logger from '../utils/logger';

interface AuthRequest extends Request {
    user?: { id: string; username: string };
}

// Service instance
const socialService = new SocialService();

// ============== Room Endpoints ==============

export const createRoom = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: 'Not authenticated' });
        }
        const room = await socialService.createRoom(req.user.id, req.body, req);
        res.status(201).json(room);
    } catch (error) {
        handleError(error, res, next);
    }
};

export const getUserRooms = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: 'Not authenticated' });
        }
        const rooms = await socialService.getUserRooms(req.user.id);
        res.status(200).json(rooms);
    } catch (error) {
        handleError(error, res, next);
    }
};

export const createInvite = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: 'Not authenticated' });
        }
        const inviteCode = await socialService.createInvite(req.user.id, req.params.roomId, req);
        res.status(200).json({ inviteCode });
    } catch (error) {
        handleError(error, res, next);
    }
};

export const getInviteInfo = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const info = await socialService.getInviteInfo(req.params.inviteCode);
        res.status(200).json(info);
    } catch (error) {
        handleError(error, res, next);
    }
};

export const joinRoom = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: 'Not authenticated' });
        }
        const { inviteCode, encryptedRoomKey } = req.body;
        const roomId = await socialService.joinRoom(req.user.id, inviteCode, encryptedRoomKey, req);
        res.status(200).json({ message: 'Successfully joined room', roomId });
    } catch (error) {
        handleError(error, res, next);
    }
};

export const getRoomContent = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: 'Not authenticated' });
        }
        const content = await socialService.getRoomContent(req.user.id, req.params.roomId);
        res.status(200).json(content);
    } catch (error) {
        handleError(error, res, next);
    }
};

export const getCollectionLinks = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: 'Not authenticated' });
        }
        const cursorCreatedAt = req.query.cursorCreatedAt as string;
        const cursorId = req.query.cursorId as string;
        const limit = parseInt(req.query.limit as string) || 30;

        const beforeCursor = cursorCreatedAt && cursorId ? {
            createdAt: cursorCreatedAt,
            id: cursorId
        } : undefined;

        const result = await socialService.getCollectionLinks(
            req.user.id,
            req.params.roomId,
            req.params.collectionId,
            limit,
            beforeCursor
        );
        res.status(200).json(result);
    } catch (error) {
        handleError(error, res, next);
    }
};

// ============== Link Endpoints ==============

export const postLink = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: 'Not authenticated' });
        }
        const linkPost = await socialService.postLink(req.user.id, req.params.roomId, req.body, req);
        res.status(201).json(linkPost);
    } catch (error) {
        handleError(error, res, next);
    }
};

export const deleteLink = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: 'Unauthorized' });
        }
        await socialService.deleteLink(req.user.id, req.params.linkId, req);
        res.status(200).json({ message: 'Link deleted successfully' });
    } catch (error) {
        handleError(error, res, next);
    }
};

export const markLinkViewed = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: 'Not authenticated' });
        }
        await socialService.markLinkViewed(req.user.id, req.params.linkId);
        res.status(200).json({ message: 'Link marked as viewed' });
    } catch (error) {
        handleError(error, res, next);
    }
};

export const unmarkLinkViewed = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: 'Not authenticated' });
        }
        await socialService.unmarkLinkViewed(req.user.id, req.params.linkId);
        res.status(200).json({ message: 'Link unmarked as viewed' });
    } catch (error) {
        handleError(error, res, next);
    }
};

export const moveLink = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: 'Unauthorized' });
        }
        const linkPost = await socialService.moveLink(req.user.id, req.params.linkId, req.body.collectionId);
        res.status(200).json({ message: 'Link moved successfully', linkPost });
    } catch (error) {
        handleError(error, res, next);
    }
};

// ============== Collection Endpoints ==============

export const createCollection = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: 'Unauthorized' });
        }
        const collection = await socialService.createCollection(req.user.id, req.params.roomId, req.body);
        res.status(201).json(collection);
    } catch (error) {
        handleError(error, res, next);
    }
};

export const deleteCollection = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: 'Unauthorized' });
        }
        await socialService.deleteCollection(req.user.id, req.params.collectionId, req);
        res.status(200).json({ message: 'Collection deleted successfully' });
    } catch (error) {
        handleError(error, res, next);
    }
};

export const reorderCollections = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: 'Unauthorized' });
        }
        const { roomId } = req.params;
        const { collectionIds } = req.body;
        await socialService.reorderCollections(req.user.id, roomId, collectionIds);
        res.status(200).json({ message: 'Collections reordered successfully' });
    } catch (error) {
        handleError(error, res, next);
    }
};

// ============== Comment Endpoints ==============

export const getComments = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: 'Not authenticated' });
        }

        const limit = parseInt(req.query.limit as string) || 20;
        const cursorCreatedAt = req.query.cursorCreatedAt as string;
        const cursorId = req.query.cursorId as string;

        const beforeCursor = cursorCreatedAt && cursorId ? {
            createdAt: cursorCreatedAt,
            id: cursorId
        } : undefined;

        const result = await socialService.getComments(
            req.user.id,
            req.params.linkId,
            limit,
            beforeCursor
        );
        res.status(200).json(result);
    } catch (error) {
        handleError(error, res, next);
    }
};

export const postComment = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: 'Not authenticated' });
        }
        const comment = await socialService.postComment(
            req.user.id,
            req.params.linkId,
            req.body.encryptedContent
        );
        res.status(201).json(comment);
    } catch (error) {
        handleError(error, res, next);
    }
};

export const deleteComment = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: 'Not authenticated' });
        }
        await socialService.deleteComment(req.user.id, req.params.commentId);
        res.status(200).json({ message: 'Comment deleted successfully' });
    } catch (error) {
        handleError(error, res, next);
    }
};

// ============== Error Handler ==============

function handleError(error: unknown, res: Response, next: NextFunction): void {
    if (error instanceof ServiceError) {
        res.status(error.statusCode).json({ message: error.message });
        return;
    }
    logger.error('Controller error:', error);
    next(error);
}
