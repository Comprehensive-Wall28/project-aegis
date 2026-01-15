import { Request, Response } from 'express';
import SharedFolder from '../models/SharedFolder';
import Folder from '../models/Folder';
import User from '../models/User';
import logger from '../utils/logger';

interface AuthRequest extends Request {
    user?: { id: string; username: string };
}

/**
 * Invite a user to a shared folder.
 */
export const invite = async (req: AuthRequest, res: Response) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: 'Not authenticated' });
        }

        const { folderId, email, encryptedSharedKey, permissions } = req.body;

        if (!folderId || !email || !encryptedSharedKey) {
            return res.status(400).json({ message: 'Missing required fields' });
        }

        // Check if folder exists and belongs to the user
        const folder = await Folder.findOne({ _id: folderId, ownerId: req.user.id });
        if (!folder) {
            return res.status(404).json({ message: 'Folder not found' });
        }

        // Find recipient
        const recipient = await User.findOne({ email });
        if (!recipient) {
            return res.status(404).json({ message: 'Recipient not found' });
        }

        if (recipient._id.toString() === req.user.id) {
            return res.status(400).json({ message: 'Cannot share folder with yourself' });
        }

        // Check if already shared
        const existingShare = await SharedFolder.findOne({ folderId, sharedWith: recipient._id });
        if (existingShare) {
            return res.status(400).json({ message: 'Folder already shared with this user' });
        }

        const sharedFolder = await SharedFolder.create({
            folderId,
            sharedBy: req.user.id,
            sharedWith: recipient._id,
            encryptedSharedKey,
            permissions: permissions || ['READ', 'DOWNLOAD'],
        });

        // Mark folder as shared if not already
        if (!folder.isShared) {
            folder.isShared = true;
            await folder.save();
        }

        logger.info(`Folder ${folderId} shared with user ${recipient.username} by ${req.user.username}`);
        res.status(201).json(sharedFolder);
    } catch (error) {
        logger.error('Error sharing folder:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

/**
 * Get folders shared with the current user.
 */
export const getSharedWithMe = async (req: AuthRequest, res: Response) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: 'Not authenticated' });
        }

        const sharedFolders = await SharedFolder.find({ sharedWith: req.user.id })
            .populate('folderId')
            .populate('sharedBy', 'username email');

        res.status(200).json(sharedFolders);
    } catch (error) {
        logger.error('Error fetching shared folders:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

/**
 * Get the encrypted shared key for a specific folder.
 */
export const getSharedFolderKey = async (req: AuthRequest, res: Response) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: 'Not authenticated' });
        }

        const { folderId } = req.params;
        const sharedFolder = await SharedFolder.findOne({
            folderId,
            sharedWith: req.user.id
        });

        if (!sharedFolder) {
            return res.status(403).json({ message: 'Access denied or folder not shared' });
        }

        res.json({
            encryptedSharedKey: sharedFolder.encryptedSharedKey
        });
    } catch (error) {
        logger.error('Error fetching shared folder key:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

