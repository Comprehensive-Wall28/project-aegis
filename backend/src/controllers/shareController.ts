import { Request, Response } from 'express';
import SharedFolder from '../models/SharedFolder';
import Folder, { IFolder } from '../models/Folder';
import User from '../models/User';
import logger from '../utils/logger';
import crypto from 'crypto';
import SharedFile from '../models/SharedFile';
import SharedLink from '../models/SharedLink';
import FileMetadata, { IFileMetadata } from '../models/FileMetadata';

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


/**
 * Invite a user to a shared file.
 */
export const inviteFile = async (req: AuthRequest, res: Response) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: 'Not authenticated' });
        }

        const { fileId, email, encryptedSharedKey, permissions } = req.body;

        if (!fileId || !email || !encryptedSharedKey) {
            return res.status(400).json({ message: 'Missing required fields' });
        }

        // Check if file exists and belongs to the user
        const file = await FileMetadata.findOne({ _id: fileId, ownerId: req.user.id });
        if (!file) {
            return res.status(404).json({ message: 'File not found' });
        }

        // Find recipient
        const recipient = await User.findOne({ email });
        if (!recipient) {
            return res.status(404).json({ message: 'Recipient not found' });
        }

        if (recipient._id.toString() === req.user.id) {
            return res.status(400).json({ message: 'Cannot share file with yourself' });
        }

        // Check if already shared
        const existingShare = await SharedFile.findOne({ fileId, sharedWith: recipient._id });
        if (existingShare) {
            return res.status(400).json({ message: 'File already shared with this user' });
        }

        const sharedFile = await SharedFile.create({
            fileId,
            sharedBy: req.user.id,
            sharedWith: recipient._id,
            encryptedSharedKey,
            permissions: permissions || ['READ', 'DOWNLOAD'],
        });

        logger.info(`File ${fileId} shared with user ${recipient.username} by ${req.user.username}`);
        res.status(201).json(sharedFile);
    } catch (error) {
        logger.error('Error sharing file:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

/**
 * Create a shared link for a file or folder.
 */
export const createLink = async (req: AuthRequest, res: Response) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: 'Not authenticated' });
        }

        const { resourceId, resourceType, encryptedKey, isPublic, allowedEmails } = req.body;

        if (!resourceId || !resourceType || !encryptedKey) {
            return res.status(400).json({ message: 'Missing required fields' });
        }

        // Verify ownership
        if (resourceType === 'file') {
            const file = await FileMetadata.findOne({ _id: resourceId, ownerId: req.user.id });
            if (!file) return res.status(404).json({ message: 'File not found' });
        } else if (resourceType === 'folder') {
            const folder = await Folder.findOne({ _id: resourceId, ownerId: req.user.id });
            if (!folder) return res.status(404).json({ message: 'Folder not found' });
        } else {
            return res.status(400).json({ message: 'Invalid resource type' });
        }

        // Generate a secure random token
        const token = crypto.randomBytes(32).toString('hex');

        const sharedLink = await SharedLink.create({
            token,
            resourceId,
            resourceType,
            encryptedKey,
            creatorId: req.user.id,
            isPublic: isPublic !== false, // Default to true if not specified, but UI should specify
            allowedEmails: allowedEmails || []
        });

        logger.info(`Shared link created for ${resourceType} ${resourceId} by ${req.user.username}`);
        res.status(201).json(sharedLink);
    } catch (error) {
        logger.error('Error creating shared link:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

/**
 * Get the encrypted shared key for a specific file (User-to-User share).
 */
export const getSharedFileKey = async (req: AuthRequest, res: Response) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: 'Not authenticated' });
        }

        const { fileId } = req.params;
        const sharedFile = await SharedFile.findOne({
            fileId,
            sharedWith: req.user.id
        });

        if (!sharedFile) {
            return res.status(403).json({ message: 'Access denied or file not shared' });
        }

        res.json({
            encryptedSharedKey: sharedFile.encryptedSharedKey
        });
    } catch (error) {
        logger.error('Error fetching shared file key:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

/**
 * Get all shared links created by the current user.
 */
export const getMyLinks = async (req: AuthRequest, res: Response) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: 'Not authenticated' });
        }

        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 5;
        const skip = (page - 1) * limit;

        const total = await SharedLink.countDocuments({ creatorId: req.user.id });
        const links = await SharedLink.find({ creatorId: req.user.id })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        // Manually populate resource details since refPath is used
        const populatedLinks = await Promise.all(links.map(async (link) => {
            const linkObj = link.toObject() as any;
            if (link.resourceType === 'file') {
                const file = await FileMetadata.findById(link.resourceId).select('originalFileName fileSize mimeType');
                linkObj.resourceDetails = file;
            } else {
                const folder = await Folder.findById(link.resourceId).select('name');
                linkObj.resourceDetails = folder;
            }
            return linkObj;
        }));

        res.json({
            links: populatedLinks,
            total,
            pages: Math.ceil(total / limit),
            currentPage: page
        });
    } catch (error) {
        logger.error('Error fetching user links:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

/**
 * Revoke/Delete a shared link.
 */
export const revokeLink = async (req: AuthRequest, res: Response) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: 'Not authenticated' });
        }

        const { id } = req.params;
        const link = await SharedLink.findOne({ _id: id, creatorId: req.user.id });

        if (!link) {
            return res.status(404).json({ message: 'Link not found or unauthorized' });
        }

        await SharedLink.deleteOne({ _id: id });

        logger.info(`Shared link ${id} revoked by ${req.user.username}`);
        res.json({ message: 'Link revoked successfully' });
    } catch (error) {
        logger.error('Error revoking shared link:', error);
        res.status(500).json({ message: 'Server error' });
    }
};
