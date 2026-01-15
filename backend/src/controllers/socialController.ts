import { Request, Response, NextFunction } from 'express';
import ogs from 'open-graph-scraper';
import { randomBytes } from 'crypto';
import mongoose from 'mongoose';
import Room from '../models/Room';
import Collection from '../models/Collection';
import LinkPost from '../models/LinkPost';
import LinkView from '../models/LinkView';
import logger from '../utils/logger';
import { logAuditEvent } from '../utils/auditLogger';

interface AuthRequest extends Request {
    user?: { id: string; username: string };
}

/**
 * Create a new room with encrypted metadata.
 * The creator becomes the owner with their encryptedRoomKey.
 */
export const createRoom = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: 'Not authenticated' });
        }

        const { name, description, icon, encryptedRoomKey } = req.body;

        if (!name || !encryptedRoomKey) {
            return res.status(400).json({
                message: 'Missing required fields: name, encryptedRoomKey'
            });
        }

        const room = await Room.create({
            name,
            description: description || '',
            icon: icon || '',
            members: [{
                userId: req.user.id,
                role: 'owner',
                encryptedRoomKey
            }]
        });

        // Create a default "Links" collection
        await Collection.create({
            roomId: room._id,
            name: '', // Client will set encrypted name
            type: 'links'
        });

        logger.info(`Room created by user ${req.user.id}`);

        await logAuditEvent(
            req.user.id,
            'ROOM_CREATE',
            'SUCCESS',
            req,
            { roomId: room._id.toString() }
        );

        res.status(201).json(room);
    } catch (error) {
        logger.error('Error creating room:', error);
        next(error);
    }
};

/**
 * Get all rooms the user is a member of.
 */
export const getUserRooms = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: 'Not authenticated' });
        }

        const rooms = await Room.find({
            'members.userId': { $eq: req.user.id }
        }).select('_id name description icon members');

        // Add user's encryptedRoomKey to each room
        const roomsWithKeys = rooms.map(room => {
            const member = room.members.find(m => m.userId.toString() === req.user!.id);
            return {
                _id: room._id,
                name: room.name,
                description: room.description,
                icon: room.icon,
                encryptedRoomKey: member?.encryptedRoomKey,
                memberCount: room.members.length
            };
        });

        res.status(200).json(roomsWithKeys);
    } catch (error) {
        logger.error('Error getting user rooms:', error);
        next(error);
    }
};

/**
 * Generate a short random invite code for a room.
 * Requires owner or admin role.
 */
export const createInvite = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: 'Not authenticated' });
        }

        const { roomId } = req.params;

        const room = await Room.findOne({
            _id: { $eq: roomId },
            'members.userId': { $eq: req.user.id }
        });

        if (!room) {
            return res.status(404).json({ message: 'Room not found' });
        }

        // Check if user has permission (owner or admin)
        const member = room.members.find(m => m.userId.toString() === req.user!.id);
        if (!member || (member.role !== 'owner' && member.role !== 'admin')) {
            return res.status(403).json({ message: 'Permission denied' });
        }

        // Generate a short, URL-safe invite code
        const inviteCode = randomBytes(6).toString('base64url');

        room.inviteCode = inviteCode;
        await room.save();

        logger.info(`Invite code created for room ${roomId} by user ${req.user.id}`);

        await logAuditEvent(
            req.user.id,
            'ROOM_INVITE_CREATE',
            'SUCCESS',
            req,
            { roomId }
        );

        res.status(200).json({ inviteCode });
    } catch (error) {
        logger.error('Error creating invite:', error);
        next(error);
    }
};

/**
 * Public endpoint to get invite information.
 * Returns encrypted room name/description for frontend to decrypt with hash key.
 */
export const getInviteInfo = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { inviteCode } = req.params;

        if (!inviteCode) {
            return res.status(400).json({ message: 'Invite code required' });
        }

        const room = await Room.findOne({
            inviteCode: { $eq: inviteCode }
        }).select('name description icon');

        if (!room) {
            return res.status(404).json({ message: 'Invite not found or expired' });
        }

        // Return encrypted data for frontend to decrypt
        res.status(200).json({
            name: room.name,
            description: room.description,
            icon: room.icon
        });
    } catch (error) {
        logger.error('Error getting invite info:', error);
        next(error);
    }
};

/**
 * Join a room using an invite code.
 * Requires the encryptedRoomKey (re-encrypted for user's vault by frontend).
 */
export const joinRoom = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: 'Not authenticated' });
        }

        const { inviteCode, encryptedRoomKey } = req.body;

        if (!inviteCode || !encryptedRoomKey) {
            return res.status(400).json({
                message: 'Missing required fields: inviteCode, encryptedRoomKey'
            });
        }

        const room = await Room.findOne({
            inviteCode: { $eq: inviteCode }
        });

        if (!room) {
            return res.status(404).json({ message: 'Invite not found or expired' });
        }

        // Check if user is already a member
        const existingMember = room.members.find(
            m => m.userId.toString() === req.user!.id
        );
        if (existingMember) {
            return res.status(400).json({ message: 'Already a member of this room' });
        }

        // Add user as member
        room.members.push({
            userId: req.user.id as any,
            role: 'member',
            encryptedRoomKey
        });

        await room.save();

        logger.info(`User ${req.user.id} joined room ${room._id}`);

        await logAuditEvent(
            req.user.id,
            'ROOM_JOIN',
            'SUCCESS',
            req,
            { roomId: room._id.toString() }
        );

        res.status(200).json({
            message: 'Successfully joined room',
            roomId: room._id
        });
    } catch (error) {
        logger.error('Error joining room:', error);
        next(error);
    }
};

/**
 * Post a link to a room collection.
 * Server fetches OpenGraph data and caches it.
 */
export const postLink = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: 'Not authenticated' });
        }

        const { roomId } = req.params;
        const { url, collectionId } = req.body;

        if (!url) {
            return res.status(400).json({ message: 'URL is required' });
        }

        // Verify user is a member of the room
        const room = await Room.findOne({
            _id: { $eq: roomId },
            'members.userId': { $eq: req.user.id }
        });

        if (!room) {
            return res.status(404).json({ message: 'Room not found or access denied' });
        }

        // Find or use default collection
        let targetCollectionId = collectionId;
        if (!targetCollectionId) {
            const defaultCollection = await Collection.findOne({
                roomId: { $eq: roomId },
                type: 'links'
            });
            if (defaultCollection) {
                targetCollectionId = defaultCollection._id;
            } else {
                return res.status(400).json({ message: 'No collection found for links' });
            }
        }

        // Verify collection belongs to room
        const collection = await Collection.findOne({
            _id: { $eq: targetCollectionId },
            roomId: { $eq: roomId }
        });

        if (!collection) {
            return res.status(404).json({ message: 'Collection not found' });
        }

        // Check for duplicate link in this collection
        const existingLink = await LinkPost.findOne({
            collectionId: targetCollectionId,
            url: url
        });

        if (existingLink) {
            return res.status(400).json({ message: 'Link already exists in this collection' });
        }

        // Fetch OpenGraph data
        let previewData = {};
        try {
            const { result } = await ogs({ url });
            previewData = {
                title: result.ogTitle || result.twitterTitle || '',
                description: result.ogDescription || result.twitterDescription || '',
                image: result.ogImage?.[0]?.url || result.twitterImage?.[0]?.url || ''
            };
        } catch (ogsError) {
            logger.warn(`Failed to fetch OpenGraph data for ${url}:`, ogsError);
            // Continue with empty preview data
        }

        const linkPost = await LinkPost.create({
            collectionId: targetCollectionId,
            userId: req.user.id,
            url,
            previewData
        });

        logger.info(`Link posted to room ${roomId} by user ${req.user.id}`);

        await logAuditEvent(
            req.user.id,
            'LINK_POST',
            'SUCCESS',
            req,
            { roomId, linkPostId: linkPost._id.toString() }
        );

        res.status(201).json(linkPost);
    } catch (error) {
        logger.error('Error posting link:', error);
        next(error);
    }
};

/**
 * Get room content including collections and link posts.
 * Protected route - requires membership.
 */
export const getRoomContent = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: 'Not authenticated' });
        }

        const { roomId } = req.params;

        // Verify user is a member
        const room = await Room.findOne({
            _id: { $eq: roomId },
            'members.userId': { $eq: req.user.id }
        });

        if (!room) {
            return res.status(404).json({ message: 'Room not found or access denied' });
        }

        // Get user's encryptedRoomKey
        const member = room.members.find(m => m.userId.toString() === req.user!.id);

        // Get all collections for the room
        const collections = await Collection.find({
            roomId: { $eq: roomId }
        }).sort({ createdAt: 1 });

        // Get all link posts for this room's collections
        const collectionIds = collections.map(c => c._id);
        const links = await LinkPost.find({
            collectionId: { $in: collectionIds }
        })
            .populate('userId', 'username')
            .sort({ createdAt: -1 });

        // Get viewed link IDs for the current user
        const viewedLinks = await LinkView.find({
            userId: req.user!.id,
            linkId: { $in: links.map(l => l._id) }
        }).select('linkId');
        const viewedLinkIds = viewedLinks.map(v => v.linkId.toString());

        // Get comment counts for each link
        const LinkComment = (await import('../models/LinkComment')).default;
        const commentCounts = await LinkComment.aggregate([
            { $match: { linkId: { $in: links.map(l => l._id) } } },
            { $group: { _id: '$linkId', count: { $sum: 1 } } }
        ]);
        const commentCountMap: Record<string, number> = {};
        commentCounts.forEach((cc: { _id: string; count: number }) => {
            commentCountMap[cc._id.toString()] = cc.count;
        });

        res.status(200).json({
            room: {
                _id: room._id,
                name: room.name,
                description: room.description,
                icon: room.icon,
                encryptedRoomKey: member?.encryptedRoomKey,
                memberCount: room.members.length
            },
            collections,
            links,
            viewedLinkIds,
            commentCounts: commentCountMap
        });
    } catch (error) {
        logger.error('Error getting room content:', error);
        next(error);
    }
};

// Delete a link post.
// Only the post creator or room owner can delete.
export const deleteLink = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const userId = req.user?.id;
        const { linkId } = req.params;

        if (!userId) {
            res.status(401).json({ message: 'Unauthorized' });
            return;
        }

        // Find the link post
        const linkPost = await LinkPost.findById(linkId);
        if (!linkPost) {
            res.status(404).json({ message: 'Link not found' });
            return;
        }

        // Find the collection to get the room
        const collection = await Collection.findById(linkPost.collectionId);
        if (!collection) {
            res.status(404).json({ message: 'Collection not found' });
            return;
        }

        // Find the room to check permissions
        const room = await Room.findById(collection.roomId);
        if (!room) {
            res.status(404).json({ message: 'Room not found' });
            return;
        }

        // Check if user is the post creator or room owner
        const isPostCreator = linkPost.userId.toString() === userId;
        const isRoomOwner = room.members.some(
            m => m.userId.toString() === userId && m.role === 'owner'
        );

        if (!isPostCreator && !isRoomOwner) {
            res.status(403).json({ message: 'You can only delete your own posts' });
            return;
        }

        await LinkPost.findByIdAndDelete(linkId);

        await logAuditEvent(userId, 'FILE_DELETE', 'SUCCESS', req, {
            action: 'delete_link_post',
            linkId,
            roomId: room._id.toString()
        });

        res.status(200).json({ message: 'Link deleted successfully' });
    } catch (error) {
        logger.error('Error deleting link:', error);
        next(error);
    }
};

/**
 * Mark a link as viewed by the current user.
 */
export const markLinkViewed = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: 'Not authenticated' });
        }

        const { linkId } = req.params;

        // Verify the link exists
        const linkPost = await LinkPost.findById(linkId);
        if (!linkPost) {
            return res.status(404).json({ message: 'Link not found' });
        }

        // Find the collection and room to verify membership
        const collection = await Collection.findById(linkPost.collectionId);
        if (!collection) {
            return res.status(404).json({ message: 'Collection not found' });
        }

        const room = await Room.findOne({
            _id: collection.roomId,
            'members.userId': req.user.id
        });

        if (!room) {
            return res.status(403).json({ message: 'Not a member of this room' });
        }

        // Create or update the view record (upsert)
        await LinkView.findOneAndUpdate(
            { linkId, userId: req.user.id },
            { viewedAt: new Date() },
            { upsert: true }
        );

        res.status(200).json({ message: 'Link marked as viewed' });
    } catch (error) {
        logger.error('Error marking link as viewed:', error);
        next(error);
    }
};

// Create a new collection in a room.
// Requires room membership.
export const createCollection = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const userId = req.user?.id;
        const { roomId } = req.params;
        const { name, type = 'links' } = req.body;

        if (!userId) {
            res.status(401).json({ message: 'Unauthorized' });
            return;
        }

        if (!name) {
            res.status(400).json({ message: 'Collection name is required' });
            return;
        }

        // Find room and verify membership
        const room = await Room.findById(roomId);
        if (!room) {
            res.status(404).json({ message: 'Room not found' });
            return;
        }

        const isMember = room.members.some(m => m.userId.toString() === userId);
        if (!isMember) {
            res.status(403).json({ message: 'Not a member of this room' });
            return;
        }

        // Create collection
        const collection = await Collection.create({
            roomId,
            name, // Already encrypted by frontend
            type
        });

        res.status(201).json(collection);
    } catch (error) {
        logger.error('Error creating collection:', error);
        next(error);
    }
};

// Move a link to a different collection.
// Requires room membership.
export const moveLink = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const userId = req.user?.id;
        const { linkId } = req.params;
        const { collectionId } = req.body;

        if (!userId) {
            res.status(401).json({ message: 'Unauthorized' });
            return;
        }

        if (!collectionId) {
            res.status(400).json({ message: 'Target collection ID is required' });
            return;
        }

        // Find the link
        const linkPost = await LinkPost.findById(linkId);
        if (!linkPost) {
            res.status(404).json({ message: 'Link not found' });
            return;
        }

        // Find target collection
        const targetCollection = await Collection.findById(collectionId);
        if (!targetCollection) {
            res.status(404).json({ message: 'Target collection not found' });
            return;
        }

        // Find the room to verify membership
        const room = await Room.findById(targetCollection.roomId);
        if (!room) {
            res.status(404).json({ message: 'Room not found' });
            return;
        }

        const isMember = room.members.some(m => m.userId.toString() === userId);
        if (!isMember) {
            res.status(403).json({ message: 'Not a member of this room' });
            return;
        }

        // Update the link's collection
        linkPost.collectionId = targetCollection._id as mongoose.Types.ObjectId;
        await linkPost.save();

        res.status(200).json({ message: 'Link moved successfully', linkPost });
    } catch (error) {
        logger.error('Error moving link:', error);
        next(error);
    }
};

// Delete a collection and all its links.
// Requires owner or admin role in the room.
export const deleteCollection = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const userId = req.user?.id;
        const { collectionId } = req.params;

        if (!userId) {
            res.status(401).json({ message: 'Unauthorized' });
            return;
        }

        // Find the collection
        const collection = await Collection.findById(collectionId);
        if (!collection) {
            res.status(404).json({ message: 'Collection not found' });
            return;
        }

        // Find the room to check permissions
        const room = await Room.findById(collection.roomId);
        if (!room) {
            res.status(404).json({ message: 'Room not found' });
            return;
        }

        // Check if user is owner or admin
        const member = room.members.find(m => m.userId.toString() === userId);
        if (!member || (member.role !== 'owner' && member.role !== 'admin')) {
            res.status(403).json({ message: 'Only room owner or admin can delete collections' });
            return;
        }

        // Delete all links in the collection
        await LinkPost.deleteMany({ collectionId: collection._id });

        // Delete the collection
        await Collection.findByIdAndDelete(collectionId);

        await logAuditEvent(userId, 'COLLECTION_DELETE', 'SUCCESS', req, {
            collectionId,
            roomId: room._id.toString()
        });

        logger.info(`Collection ${collectionId} deleted by user ${userId}`);

        res.status(200).json({ message: 'Collection deleted successfully' });
    } catch (error) {
        logger.error('Error deleting collection:', error);
        next(error);
    }
};

/**
 * Get all comments for a link.
 * Requires room membership.
 */
export const getComments = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: 'Not authenticated' });
        }

        const { linkId } = req.params;

        // Find the link
        const linkPost = await LinkPost.findById(linkId);
        if (!linkPost) {
            return res.status(404).json({ message: 'Link not found' });
        }

        // Verify room membership
        const collection = await Collection.findById(linkPost.collectionId);
        if (!collection) {
            return res.status(404).json({ message: 'Collection not found' });
        }

        const room = await Room.findOne({
            _id: collection.roomId,
            'members.userId': req.user.id
        });

        if (!room) {
            return res.status(403).json({ message: 'Not a member of this room' });
        }

        // Get comments
        const LinkComment = (await import('../models/LinkComment')).default;
        const comments = await LinkComment.find({ linkId })
            .populate('userId', 'username')
            .sort({ createdAt: 1 });

        res.status(200).json(comments);
    } catch (error) {
        logger.error('Error getting comments:', error);
        next(error);
    }
};

/**
 * Post a new encrypted comment on a link.
 * Requires room membership.
 */
export const postComment = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: 'Not authenticated' });
        }

        const { linkId } = req.params;
        const { encryptedContent } = req.body;

        if (!encryptedContent) {
            return res.status(400).json({ message: 'Encrypted content is required' });
        }

        // Find the link
        const linkPost = await LinkPost.findById(linkId);
        if (!linkPost) {
            return res.status(404).json({ message: 'Link not found' });
        }

        // Verify room membership
        const collection = await Collection.findById(linkPost.collectionId);
        if (!collection) {
            return res.status(404).json({ message: 'Collection not found' });
        }

        const room = await Room.findOne({
            _id: collection.roomId,
            'members.userId': req.user.id
        });

        if (!room) {
            return res.status(403).json({ message: 'Not a member of this room' });
        }

        // Create comment
        const LinkComment = (await import('../models/LinkComment')).default;
        const comment = await LinkComment.create({
            linkId,
            userId: req.user.id,
            encryptedContent
        });

        // Populate user info
        await comment.populate('userId', 'username');

        logger.info(`Comment posted on link ${linkId} by user ${req.user.id}`);

        res.status(201).json(comment);
    } catch (error) {
        logger.error('Error posting comment:', error);
        next(error);
    }
};

/**
 * Delete a comment.
 * Only the comment author or room owner can delete.
 */
export const deleteComment = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: 'Not authenticated' });
        }

        const { commentId } = req.params;

        // Find the comment
        const LinkComment = (await import('../models/LinkComment')).default;
        const comment = await LinkComment.findById(commentId);
        if (!comment) {
            return res.status(404).json({ message: 'Comment not found' });
        }

        // Find the link and room to check permissions
        const linkPost = await LinkPost.findById(comment.linkId);
        if (!linkPost) {
            return res.status(404).json({ message: 'Link not found' });
        }

        const collection = await Collection.findById(linkPost.collectionId);
        if (!collection) {
            return res.status(404).json({ message: 'Collection not found' });
        }

        const room = await Room.findById(collection.roomId);
        if (!room) {
            return res.status(404).json({ message: 'Room not found' });
        }

        // Check permissions
        const isCommentAuthor = comment.userId.toString() === req.user.id;
        const isRoomOwner = room.members.some(
            m => m.userId.toString() === req.user!.id && m.role === 'owner'
        );

        if (!isCommentAuthor && !isRoomOwner) {
            return res.status(403).json({ message: 'Permission denied' });
        }

        await LinkComment.findByIdAndDelete(commentId);

        logger.info(`Comment ${commentId} deleted by user ${req.user.id}`);

        res.status(200).json({ message: 'Comment deleted successfully' });
    } catch (error) {
        logger.error('Error deleting comment:', error);
        next(error);
    }
};
