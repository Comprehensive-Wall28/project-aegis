import { Request, Response } from 'express';
import FileMetadata from '../models/FileMetadata';
import { initiateUpload, appendChunk, finalizeUpload, getFileStream } from '../services/gridfsService';
import logger from '../utils/logger';
import { logAuditEvent } from '../utils/auditLogger';

interface AuthRequest extends Request {
    user?: any;
}

export const uploadInit = async (req: AuthRequest, res: Response) => {
    try {
        const { fileName, originalFileName, fileSize, encryptedSymmetricKey, encapsulatedKey, mimeType } = req.body;

        if (!fileName || !originalFileName || !fileSize || !encryptedSymmetricKey || !encapsulatedKey || !mimeType) {
            return res.status(400).json({ message: 'Missing file metadata' });
        }

        if (!req.user || !req.user.id) {
            return res.status(401).json({ message: 'User not authenticated' });
        }

        // Initiate GridFS upload session
        const uploadStreamId = initiateUpload(originalFileName, {
            ownerId: req.user.id,
            encryptedSymmetricKey,
            encapsulatedKey
        });

        const fileRecord = await FileMetadata.create({
            ownerId: req.user.id,
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

        const fileRecord = await FileMetadata.findOne({ _id: fileId, ownerId: req.user.id });
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

        // Append chunk to GridFS upload session
        const { complete, receivedSize } = await appendChunk(
            fileRecord.uploadStreamId,
            chunkBuffer,
            rangeStart,
            rangeEnd,
            totalSize
        );

        if (complete) {
            // Finalize the upload
            const gridfsFileId = await finalizeUpload(
                fileRecord.uploadStreamId,
                fileRecord.fileName,
                {
                    ownerId: fileRecord.ownerId,
                    mimeType: fileRecord.mimeType
                }
            );

            fileRecord.gridfsFileId = gridfsFileId as any;
            fileRecord.status = 'completed';
            fileRecord.uploadStreamId = undefined; // Clear session
            await fileRecord.save();

            logger.info(`Vault upload completed: ${fileId} -> GridFS ${gridfsFileId}`);
            res.status(200).json({ message: 'Upload successful', gridfsFileId: gridfsFileId.toString() });
        } else {
            // Send 308 Resume Incomplete (following Google Drive convention for compatibility)
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
        const fileRecord = await FileMetadata.findOne({ _id: fileId, ownerId: req.user.id });

        if (!fileRecord || !fileRecord.gridfsFileId) {
            return res.status(404).json({ message: 'File not found or not ready' });
        }

        const stream = getFileStream(fileRecord.gridfsFileId);

        // Handle stream errors
        stream.on('error', (err) => {
            logger.error(`GridFS stream error: ${err}`);
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

        const files = await FileMetadata.find({ ownerId: req.user.id }).sort({ createdAt: -1 });
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
        const fileRecord = await FileMetadata.findOne({ _id: fileId, ownerId: req.user.id });

        if (!fileRecord) {
            return res.status(404).json({ message: 'File not found' });
        }

        // Delete from GridFS if file was uploaded
        if (fileRecord.gridfsFileId) {
            const { deleteFile } = await import('../services/gridfsService');
            await deleteFile(fileRecord.gridfsFileId);
        }

        // Delete metadata record
        await FileMetadata.deleteOne({ _id: fileId });

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
