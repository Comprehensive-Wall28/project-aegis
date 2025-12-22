import { Request, Response } from 'express';
import FileMetadata from '../models/FileMetadata';
import { initiateGoogleDriveUpload, getFileStream } from '../services/googleDriveService';
import logger from '../utils/logger';

interface AuthRequest extends Request {
    user?: any;
}

export const uploadInit = async (req: AuthRequest, res: Response) => {
    try {
        const { fileName, fileSize, encryptedSymmetricKey, mimeType } = req.body;

        if (!fileName || !fileSize || !encryptedSymmetricKey || !mimeType) {
            return res.status(400).json({ message: 'Missing file metadata' });
        }

        if (!req.user || !req.user.id) {
            return res.status(401).json({ message: 'User not authenticated' });
        }

        try {
            const uploadUrl = await initiateGoogleDriveUpload(fileName, mimeType);

            const fileRecord = await FileMetadata.create({
                ownerId: req.user.id,
                fileName, // Already encrypted
                fileSize,
                encryptedSymmetricKey,
                mimeType,
                status: 'pending'
            });

            logger.info(`Vault upload initiated: ${fileName} by User ${req.user.id}`);

            res.status(200).json({
                uploadUrl,
                fileId: fileRecord._id
            });

        } catch (gError) {
            logger.error(`Google Drive Init Failed: ${gError}`);
            return res.status(500).json({ message: 'Failed to initiate vault upload' });
        }

    } catch (error) {
        logger.error(`Upload Init Error: ${error}`);
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

        if (!fileRecord || !fileRecord.googleDriveFileId) {
            // If we don't have the googleDriveFileId yet (e.g. pending upload not updated), we can't download.
            // Note: In a real flow, client updates the DB with the Google File ID after upload.
            // Since I haven't implemented that update endpoint, this would fail for 'pending' files effectively.
            return res.status(404).json({ message: 'File not found or not ready' });
        }

        const stream = await getFileStream(fileRecord.googleDriveFileId);

        res.setHeader('Content-Type', fileRecord.mimeType || 'application/octet-stream');
        res.setHeader('Content-Disposition', `attachment; filename="${fileRecord.fileName}"`);

        stream.pipe(res);
        logger.info(`Vault download started: ${fileRecord.fileName} (${fileId})`);

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
