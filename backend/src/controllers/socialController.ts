import { Request, Response, NextFunction } from 'express';
import ogs from 'open-graph-scraper';
import { randomBytes } from 'crypto';
import mongoose from 'mongoose';
import Room from '../models/Room';
import Collection from '../models/Collection';
import LinkPost from '../models/LinkPost';
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
            links
        });
    } catch (error) {
        logger.error('Error getting room content:', error);
        next(error);
    }
};
