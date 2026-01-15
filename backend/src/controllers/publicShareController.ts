import { Request, Response } from 'express';
import SharedLink from '../models/SharedLink';
import FileMetadata from '../models/FileMetadata';
import Folder from '../models/Folder';
import { getFileStream } from '../services/googleDriveService';
import logger from '../utils/logger';

/**
 * Get metadata for a shared link.
 * Access: Public
 */
export const getLinkMetadata = async (req: Request, res: Response) => {
    try {
        const { token } = req.params;

        const link = await SharedLink.findOne({ token });
        if (!link) {
            return res.status(404).json({ message: 'Link not found or expired' });
        }

        // Increment view count
        link.views += 1;
        await link.save();

        let metadata;
        if (link.resourceType === 'file') {
            const file = await FileMetadata.findById(link.resourceId).select('originalFileName fileSize mimeType createdAt ownerId');
            if (!file) return res.status(404).json({ message: 'File not found' });

            let ownerName = 'Aegis User';
            if (file.ownerId) {
                // We rely on the internal User model logic if we want to fetch name
                // Dynamic import to avoid cycles if any, or just import at top if clean
                const User = require('../models/User').default;
                const owner = await User.findById(file.ownerId).select('username');
                if (owner) ownerName = owner.username;
            }

            metadata = {
                type: 'file',
                name: file.originalFileName,
                size: file.fileSize,
                mimeType: file.mimeType,
                createdAt: file.createdAt,
                id: file._id,
                ownerName
            };
        } else {
            const folder = await Folder.findById(link.resourceId).select('name createdAt ownerId');
            if (!folder) return res.status(404).json({ message: 'Folder not found' });

            let ownerName = 'Aegis User';
            if (folder.ownerId) {
                const User = require('../models/User').default;
                const owner = await User.findById(folder.ownerId).select('username');
                if (owner) ownerName = owner.username;
            }

            metadata = {
                type: 'folder',
                name: folder.name,
                createdAt: folder.createdAt,
                id: folder._id,
                ownerName
            };
        }

        res.json({
            metadata,
            encryptedKey: link.encryptedKey, // Client needs this to decrypt file content
            isPublic: link.isPublic,
            requiresAuth: !link.isPublic // Hint to frontend if it needs to show login
        });

    } catch (error) {
        logger.error('Error fetching link metadata:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

/**
 * Download file via shared link.
 * Access: Public (if link is public)
 */
export const downloadSharedFile = async (req: Request, res: Response) => {
    try {
        const { token } = req.params;

        const link = await SharedLink.findOne({ token });
        if (!link) {
            return res.status(404).json({ message: 'Link not found' });
        }

        if (link.resourceType !== 'file') {
            return res.status(400).json({ message: 'Not a file link' });
        }

        // TODO: content check for restricted links if we enforce granular auth here
        // For now, assuming public links or that token possession implies access for beta.
        // To strictly enforce restricted links, we'd need to check req.user vs link.allowedEmails

        const fileRecord = await FileMetadata.findById(link.resourceId);
        if (!fileRecord || !fileRecord.googleDriveFileId) {
            return res.status(404).json({ message: 'File not found' });
        }

        const stream = await getFileStream(fileRecord.googleDriveFileId);

        stream.on('error', (err) => {
            logger.error(`Google Drive stream error: ${err}`);
            if (!res.headersSent) {
                res.status(500).json({ message: 'Download failed' });
            }
        });

        res.setHeader('Content-Type', fileRecord.mimeType || 'application/octet-stream');
        res.setHeader('Content-Disposition', `attachment; filename="${fileRecord.originalFileName}"`);
        res.setHeader('Content-Length', fileRecord.fileSize.toString());

        stream.pipe(res);

    } catch (error) {
        logger.error('Shared file download error:', error);
        res.status(500).json({ message: 'Download failed' });
    }
};
