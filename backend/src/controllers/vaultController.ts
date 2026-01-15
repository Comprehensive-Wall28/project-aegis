import { Request, Response } from 'express';
import FileMetadata from '../models/FileMetadata';
import Folder from '../models/Folder';
import SharedFolder from '../models/SharedFolder';
import { initiateUpload, appendChunk, finalizeUpload, getFileStream, deleteFile } from '../services/googleDriveService';
import logger from '../utils/logger';
import { logAuditEvent } from '../utils/auditLogger';

interface AuthRequest extends Request {
    user?: any;
}

export const uploadInit = async (req: AuthRequest, res: Response) => {
    try {
        const { fileName, originalFileName, fileSize, encryptedSymmetricKey, encapsulatedKey, mimeType, folderId } = req.body;

        if (!fileName || !originalFileName || !fileSize || !encryptedSymmetricKey || !encapsulatedKey || !mimeType) {
            return res.status(400).json({ message: 'Missing file metadata' });
        }

        if (!req.user || !req.user.id) {
            return res.status(401).json({ message: 'User not authenticated' });
        }

        // Initiate Google Drive resumable upload session
        const uploadStreamId = await initiateUpload(originalFileName, fileSize, {
            ownerId: req.user.id,
            encryptedSymmetricKey,
            encapsulatedKey
        });

        const fileRecord = await FileMetadata.create({
            ownerId: req.user.id,
            folderId: folderId || null,
            fileName, // Encrypted filename
            originalFileName, // Original filename for display
            fileSize,
            encryptedSymmetricKey,
            encapsulatedKey,
            mimeType,
            uploadStreamId,
            status: 'pending'
        });

        logger.info(`Vault upload initiated: ${originalFileName} by User ${req.user.id}`);

        // Log file upload initiation
        await logAuditEvent(
            req.user.id,
            'FILE_UPLOAD',
            'SUCCESS',
            req,
            {
                fileName: originalFileName,
                fileSize,
                mimeType,
                fileId: fileRecord._id.toString()
            }
        );

        res.status(200).json({
            fileId: fileRecord._id
        });

    } catch (error) {
        logger.error(`Upload Init Error: ${error}`);
        res.status(500).json({ message: 'Server error' });
    }
};

export const uploadChunk = async (req: AuthRequest, res: Response) => {
    try {
        if (!req.user || !req.user.id) {
            return res.status(401).json({ message: 'User not authenticated' });
        }

        const fileId = req.query.fileId as string;
        const contentRange = req.headers['content-range'] as string;

        if (!fileId || !contentRange) {
            return res.status(400).json({ message: 'Missing fileId or Content-Range' });
        }

        const fileRecord = await FileMetadata.findOne({
            _id: { $eq: fileId },
            ownerId: { $eq: req.user.id }
        });
        if (!fileRecord || !fileRecord.uploadStreamId) {
            return res.status(404).json({ message: 'File not found or session invalid' });
        }

        // Parse Content-Range: "bytes START-END/TOTAL"
        const rangeMatch = contentRange.match(/bytes (\d+)-(\d+)\/(\d+)/);
        if (!rangeMatch) {
            return res.status(400).json({ message: 'Invalid Content-Range header' });
        }

        const rangeStart = parseInt(rangeMatch[1], 10);
        const rangeEnd = parseInt(rangeMatch[2], 10);
        const totalSize = parseInt(rangeMatch[3], 10);

        // Collect chunk data from request body
        const chunks: Buffer[] = [];

        await new Promise<void>((resolve, reject) => {
            req.on('data', (chunk: Buffer) => {
                chunks.push(chunk);
            });
            req.on('end', () => resolve());
            req.on('error', (err) => reject(err));
        });

        const chunkBuffer = Buffer.concat(chunks);

        // Update status to uploading if still pending
        if (fileRecord.status === 'pending') {
            fileRecord.status = 'uploading';
            await fileRecord.save();
        }

        // Append chunk to Google Drive upload session
        const { complete, receivedSize } = await appendChunk(
            fileRecord.uploadStreamId,
            chunkBuffer,
            rangeStart,
            rangeEnd,
            totalSize
        );

        if (complete) {
            // Finalize the upload
            const googleDriveFileId = await finalizeUpload(fileRecord.uploadStreamId);

            fileRecord.googleDriveFileId = googleDriveFileId;
            fileRecord.status = 'completed';
            fileRecord.uploadStreamId = undefined; // Clear session
            await fileRecord.save();

            logger.info(`Vault upload completed: ${fileId} -> Google Drive ${googleDriveFileId}`);
            res.status(200).json({ message: 'Upload successful', googleDriveFileId });
        } else {
            // Send 308 Resume Incomplete (following Google Drive convention)
            res.status(308).set('Range', `bytes=0-${receivedSize - 1}`).send();
        }

    } catch (error) {
        logger.error(`Upload Chunk Error: ${error}`);
        res.status(500).json({ message: 'Server error' });
    }
};

export const downloadFile = async (req: AuthRequest, res: Response) => {
    try {
        if (!req.user || !req.user.id) {
            return res.status(401).json({ message: 'User not authenticated' });
        }

        const fileId = req.params.id;
        let fileRecord = await FileMetadata.findOne({
            _id: { $eq: fileId },
            ownerId: { $eq: req.user.id }
        });

        // If not owner, check if file is in a shared folder
        if (!fileRecord) {
            const potentialFile = await FileMetadata.findById(fileId);
            if (potentialFile && potentialFile.folderId) {
                const isShared = await SharedFolder.findOne({
                    folderId: potentialFile.folderId,
                    sharedWith: req.user.id
                });
                if (isShared && isShared.permissions.includes('DOWNLOAD')) {
                    fileRecord = potentialFile;
                }
            }
        }

        if (!fileRecord || !fileRecord.googleDriveFileId) {
            return res.status(404).json({ message: 'File not found or not ready' });
        }

        const stream = await getFileStream(fileRecord.googleDriveFileId);

        // Handle stream errors
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
        logger.info(`Vault download started: ${fileRecord.originalFileName} (${fileId})`);

    } catch (error) {
        logger.error(`Download Error: ${error}`);
        res.status(500).json({ message: 'Download failed' });
    }
}

export const getUserFiles = async (req: AuthRequest, res: Response) => {
    try {
        if (!req.user || !req.user.id) {
            return res.status(401).json({ message: 'User not authenticated' });
        }

        const { folderId } = req.query;
        let query: any = { ownerId: req.user.id };

        if (folderId && folderId !== 'null') {
            const folder = await Folder.findById(folderId);
            if (!folder) {
                return res.status(404).json({ message: 'Folder not found' });
            }

            const isOwner = folder.ownerId.toString() === req.user.id;
            let hasAccess = isOwner;

            if (!hasAccess) {
                // Check direct share
                const directShare = await SharedFolder.findOne({ folderId, sharedWith: req.user.id });
                if (directShare) {
                    hasAccess = true;
                } else {
                    // Check ancestors
                    let current = folder;
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
                return res.status(403).json({ message: 'Access denied to this folder' });
            }

            // Always fetch files owned by the folder's owner
            query = { folderId: { $eq: folderId }, ownerId: { $eq: folder.ownerId } };
        } else {
            // Root level files - show only owned ones (shared folders appear as distinct objects)
            query = { ownerId: { $eq: req.user.id }, folderId: null };
        }

        const files = await FileMetadata.find(query).sort({ createdAt: -1 });

        res.json(files);
    } catch (error) {
        logger.error(`Get Files Error: ${error}`);
        res.status(500).json({ message: 'Server error' });
    }
};

export const deleteUserFile = async (req: AuthRequest, res: Response) => {
    try {
        if (!req.user || !req.user.id) {
            return res.status(401).json({ message: 'User not authenticated' });
        }

        const fileId = req.params.id;
        const fileRecord = await FileMetadata.findOne({
            _id: { $eq: fileId },
            ownerId: { $eq: req.user.id }
        });

        if (!fileRecord) {
            return res.status(404).json({ message: 'File not found' });
        }

        // Delete from Google Drive if file was uploaded
        if (fileRecord.googleDriveFileId) {
            await deleteFile(fileRecord.googleDriveFileId);
        }

        // Delete metadata record
        await FileMetadata.deleteOne({ _id: { $eq: fileId } });

        logger.info(`Vault file deleted: ${fileRecord.fileName} (${fileId}) by User ${req.user.id}`);

        // Log file deletion
        await logAuditEvent(
            req.user.id,
            'FILE_DELETE',
            'SUCCESS',
            req,
            {
                fileName: fileRecord.originalFileName,
                fileId: fileId
            }
        );

        res.status(200).json({ message: 'File deleted successfully' });

    } catch (error) {
        logger.error(`Delete File Error: ${error}`);
        res.status(500).json({ message: 'Delete failed' });
    }
};
