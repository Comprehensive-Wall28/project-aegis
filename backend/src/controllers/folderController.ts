import { Request, Response } from 'express';
import Folder from '../models/Folder';
import FileMetadata from '../models/FileMetadata';
import SharedFolder from '../models/SharedFolder';
import logger from '../utils/logger';

interface AuthRequest extends Request {
    user?: { id: string; username: string };
}

/**
 * Get all folders for the authenticated user in a specific parent folder.
 */
export const getFolders = async (req: AuthRequest, res: Response) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: 'Not authenticated' });
        }

        const { parentId: rawParentId } = req.query;
        let parentId: string | null = null;

        // Normalize rawParentId: if array, take first element
        let candidate = rawParentId;
        if (Array.isArray(rawParentId)) {
            candidate = rawParentId[0];
        }

        // If "null", undefined, or empty, treat as root (null parentId)
        if (!candidate || candidate === 'null') {
            parentId = null;
        } else {
            // Otherwise ensure it is a string
            if (typeof candidate !== 'string') {
                return res.status(400).json({ message: 'Invalid parentId format' });
            }
            parentId = candidate;
        }

        let finalFolders: any[] = [];

        if (parentId === null) {
            // Root level: Fetch owned root folders and all folders shared with the user
            const ownedFolders = await Folder.find({
                ownerId: { $eq: req.user.id },
                parentId: null
            }).sort({ name: 1 });

            const sharedFolderEntries = await SharedFolder.find({ sharedWith: req.user.id })
                .populate('folderId');

            const sharedFolders = sharedFolderEntries
                .filter(sf => sf.folderId)
                .map(sf => {
                    const f = sf.folderId as any;
                    return {
                        ...f.toObject(),
                        isSharedWithMe: true,
                        encryptedSharedKey: sf.encryptedSharedKey,
                        permissions: sf.permissions
                    };
                });

            finalFolders = [...ownedFolders, ...sharedFolders];
        } else {
            // Subfolder: Verify access first
            const parentFolder = await Folder.findById(parentId);
            if (!parentFolder) {
                return res.status(404).json({ message: 'Parent folder not found' });
            }

            const isOwner = parentFolder.ownerId.toString() === req.user.id;
            let hasAccess = isOwner;

            if (!hasAccess) {
                // Check direct share
                const directShare = await SharedFolder.findOne({ folderId: parentId, sharedWith: req.user.id });
                if (directShare) {
                    hasAccess = true;
                } else {
                    // Check ancestors
                    let current = parentFolder;
                    while (current.parentId) {
                        const ancestorShare = await SharedFolder.findOne({
                            folderId: current.parentId,
                            sharedWith: req.user.id
                        });
                        if (ancestorShare) {
                            hasAccess = true;
                            break;
                        }
                        const parent = await Folder.findById(current.parentId);
                        if (!parent) break;
                        current = parent;
                    }
                }
            }

            if (!hasAccess) {
                return res.status(403).json({ message: 'Access denied' });
            }

            // Note: If navigating a SHARED tree, we fetch folders owned by the same owner
            const subfolders = await Folder.find({
                parentId: { $eq: parentId },
                ownerId: { $eq: parentFolder.ownerId }
            }).sort({ name: 1 });

            // If it's a shared tree, mark children as shared too for UI hints
            if (!isOwner) {
                finalFolders = subfolders.map(f => ({
                    ...f.toObject(),
                    isSharedWithMe: true
                }));
            } else {
                finalFolders = subfolders;
            }

        }

        res.status(200).json(finalFolders);

    } catch (error) {
        logger.error('Error fetching folders:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

/**
 * Get a single folder by ID.
 */
export const getFolder = async (req: AuthRequest, res: Response) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: 'Not authenticated' });
        }

        const { id } = req.params;
        let folder = await Folder.findOne({ _id: { $eq: id }, ownerId: { $eq: req.user.id } });

        // If not owner, check if the folder is shared with this user
        if (!folder) {
            const isShared = await SharedFolder.findOne({ folderId: { $eq: id }, sharedWith: { $eq: req.user.id } });
            if (isShared) {
                folder = await Folder.findById(id);
            }
        }

        if (!folder) {
            return res.status(404).json({ message: 'Folder not found or access denied' });
        }


        res.status(200).json(folder);
    } catch (error) {
        logger.error('Error fetching folder:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

/**
 * Create a new folder.
 */
export const createFolder = async (req: AuthRequest, res: Response) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: 'Not authenticated' });
        }

        const { name, parentId, encryptedSessionKey } = req.body;

        if (!name || name.trim() === '') {
            return res.status(400).json({ message: 'Folder name is required' });
        }

        if (!encryptedSessionKey) {
            return res.status(400).json({ message: 'Encrypted session key is required' });
        }

        const folder = await Folder.create({
            ownerId: req.user.id,
            name: name.trim(),
            parentId: parentId || null,
            encryptedSessionKey,
        });

        logger.info(`Folder created: ${folder.name} for user ${req.user.id}`);
        res.status(201).json(folder);
    } catch (error) {
        logger.error('Error creating folder:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

/**
 * Rename a folder.
 */
export const renameFolder = async (req: AuthRequest, res: Response) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: 'Not authenticated' });
        }

        const { id } = req.params;
        const { name } = req.body;

        if (!name || name.trim() === '') {
            return res.status(400).json({ message: 'Folder name is required' });
        }

        const folder = await Folder.findOneAndUpdate(
            { _id: { $eq: id }, ownerId: { $eq: req.user.id } },
            { name: name.trim() },
            { new: true }
        );

        if (!folder) {
            return res.status(404).json({ message: 'Folder not found' });
        }

        logger.info(`Folder renamed: ${folder.name} for user ${req.user.id}`);
        res.status(200).json(folder);
    } catch (error) {
        logger.error('Error renaming folder:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

/**
 * Delete a folder (only if empty).
 */
export const deleteFolder = async (req: AuthRequest, res: Response) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: 'Not authenticated' });
        }

        const { id } = req.params;

        // Check if folder has any files
        const filesCount = await FileMetadata.countDocuments({
            folderId: { $eq: id },
            ownerId: { $eq: req.user.id }
        });
        if (filesCount > 0) {
            return res.status(400).json({ message: 'Cannot delete folder with files. Move or delete files first.' });
        }

        // Check if folder has any subfolders
        const subfoldersCount = await Folder.countDocuments({
            parentId: { $eq: id },
            ownerId: { $eq: req.user.id }
        });
        if (subfoldersCount > 0) {
            return res.status(400).json({ message: 'Cannot delete folder with subfolders. Delete subfolders first.' });
        }

        const folder = await Folder.findOneAndDelete({
            _id: { $eq: id },
            ownerId: { $eq: req.user.id }
        });
        if (!folder) {
            return res.status(404).json({ message: 'Folder not found' });
        }

        logger.info(`Folder deleted: ${folder.name} for user ${req.user.id}`);
        res.status(200).json({ message: 'Folder deleted successfully' });
    } catch (error) {
        logger.error('Error deleting folder:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

/**
 * Move files to a folder (supports bulk move).
 */
export const moveFiles = async (req: AuthRequest, res: Response) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: 'Not authenticated' });
        }

        const { fileIds, folderId } = req.body;

        if (!fileIds || !Array.isArray(fileIds) || fileIds.length === 0) {
            return res.status(400).json({ message: 'File IDs are required' });
        }

        // Validate folderId: if missing/empty treat as root (null), ensuring it's a string
        let normalizedFolderId: string | null = null;
        if (folderId && folderId !== '') {
            if (typeof folderId !== 'string') {
                return res.status(400).json({ message: 'Invalid folderId format' });
            }
            normalizedFolderId = folderId;
        }

        // Validate folder exists (if not moving to root)
        if (normalizedFolderId) {
            // Use strict cast check or try/catch if concerned about CastError, but original code didn't. 
            // We'll trust normalizedFolderId is a string, and if it's not a valid ObjectId, Mongoose might throw.
            // We can wrap this specifically to give better error.
            try {
                const folder = await Folder.findOne({
                    _id: { $eq: normalizedFolderId },
                    ownerId: { $eq: req.user.id }
                });
                if (!folder) {
                    return res.status(404).json({ message: 'Target folder not found' });
                }
            } catch (err) {
                logger.error('Error finding folder (likely invalid ID format):', err);
                return res.status(400).json({ message: 'Invalid folder ID' });
            }
        }

        // Update all files
        const result = await FileMetadata.updateMany(
            { _id: { $in: fileIds }, ownerId: { $eq: req.user.id } },
            { folderId: normalizedFolderId }
        );

        logger.info(`Moved ${result.modifiedCount} files to folder ${normalizedFolderId || 'root'} for user ${req.user.id}`);
        res.status(200).json({
            message: `Moved ${result.modifiedCount} file(s)`,
            modifiedCount: result.modifiedCount
        });
    } catch (error) {
        logger.error('Error moving files:', error);
        res.status(500).json({ message: 'Server error' });
    }
};
