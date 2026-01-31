import { Request } from 'express';
import { Readable } from 'stream';
import mongoose from 'mongoose';
import { BaseService, ServiceError } from './base/BaseService';
import { INoteMedia } from '../models/NoteMedia';
import NoteMedia from '../models/NoteMedia';
import {
    initiateUpload,
    appendChunk,
    finalizeUpload,
    getFileStream,
    deleteFile
} from './gridfsService';
import logger from '../utils/logger';

export interface NoteMediaUploadInitDTO {
    fileName: string;
    originalFileName: string;
    fileSize: number;
    encryptedSymmetricKey: string;
    encapsulatedKey: string;
    mimeType: string;
}

export class NoteMediaService extends BaseService<INoteMedia, any> {
    constructor() {
        super(NoteMedia as any);
    }

    /**
     * Initialize a media upload session in GridFS
     */
    async initUpload(
        userId: string,
        data: NoteMediaUploadInitDTO,
        req: Request
    ): Promise<{ mediaId: string }> {
        try {
            // 1. Initiate GridFS upload session
            const uploadStreamId = initiateUpload(data.originalFileName, {
                ownerId: userId,
                type: 'note-media',
                encryptedSymmetricKey: data.encryptedSymmetricKey,
                encapsulatedKey: data.encapsulatedKey
            });

            // 2. Create NoteMedia record
            const mediaRecord = await NoteMedia.create({
                ownerId: new mongoose.Types.ObjectId(userId),
                fileName: data.fileName,
                originalFileName: data.originalFileName,
                fileSize: data.fileSize,
                mimeType: data.mimeType,
                encapsulatedKey: data.encapsulatedKey,
                encryptedSymmetricKey: data.encryptedSymmetricKey,
                uploadStreamId,
                status: 'pending'
            });

            return { mediaId: mediaRecord._id.toString() };
        } catch (error) {
            logger.error('Note media upload init error:', error);
            throw new ServiceError('Failed to initialize media upload', 500);
        }
    }

    /**
     * Process a chunk for note media
     */
    async uploadChunk(
        userId: string,
        mediaId: string,
        contentRange: string,
        chunk: Readable | Buffer,
        chunkLength: number
    ): Promise<{ complete: boolean; receivedSize: number }> {
        try {
            const mediaRecord = await NoteMedia.findOne({ _id: mediaId, ownerId: userId });
            if (!mediaRecord || !mediaRecord.uploadStreamId) {
                throw new ServiceError('Media record not found or session invalid', 404);
            }

            // Parse Content-Range
            const rangeMatch = contentRange.match(/bytes (\d+)-(\d+)\/(\d+)/);
            if (!rangeMatch) {
                throw new ServiceError('Invalid Content-Range header', 400);
            }

            const rangeStart = parseInt(rangeMatch[1], 10);
            const rangeEnd = parseInt(rangeMatch[2], 10);
            const totalSize = parseInt(rangeMatch[3], 10);

            // Update status if needed
            if (mediaRecord.status === 'pending') {
                mediaRecord.status = 'uploading';
                await mediaRecord.save();
            }

            // Append chunk to GridFS (handles both Buffer and Readable streams)
            const { complete, receivedSize } = await appendChunk(
                mediaRecord.uploadStreamId,
                chunk,
                rangeStart,
                rangeEnd,
                totalSize
            );

            if (complete) {
                // Finalize GridFS upload
                const gridFsFileId = await finalizeUpload(mediaRecord.uploadStreamId, mediaRecord.originalFileName);

                mediaRecord.gridFsFileId = gridFsFileId;
                mediaRecord.status = 'completed';
                mediaRecord.uploadStreamId = undefined; // Session finished
                await mediaRecord.save();

                return { complete: true, receivedSize };
            }

            return { complete: false, receivedSize };
        } catch (error) {
            if (error instanceof ServiceError) throw error;
            logger.error('Note media upload chunk error:', error);
            throw new ServiceError('Failed to process media chunk', 500);
        }
    }

    /**
     * Get a download stream for note media
     */
    async getDownloadStream(
        userId: string,
        mediaId: string
    ): Promise<{ stream: Readable; media: INoteMedia }> {
        try {
            const mediaRecord = await NoteMedia.findOne({ _id: mediaId, ownerId: userId });
            if (!mediaRecord || mediaRecord.status !== 'completed' || !mediaRecord.gridFsFileId) {
                throw new ServiceError('Media not found or not ready', 404);
            }

            const stream = getFileStream(mediaRecord.gridFsFileId);
            return { stream, media: mediaRecord };
        } catch (error) {
            if (error instanceof ServiceError) throw error;
            logger.error('Note media download error:', error);
            throw new ServiceError('Download failed', 500);
        }
    }

    /**
     * Get media metadata
     */
    async getMedia(userId: string, mediaId: string): Promise<INoteMedia> {
        const media = await NoteMedia.findOne({ _id: mediaId, ownerId: userId });
        if (!media) {
            throw new ServiceError('Media not found', 404);
        }
        return media;
    }

    /**
     * Delete media
     */
    async deleteMedia(userId: string, mediaId: string): Promise<void> {
        const mediaRecord = await NoteMedia.findOne({ _id: mediaId, ownerId: userId });
        if (!mediaRecord) {
            throw new ServiceError('Media not found', 404);
        }

        if (mediaRecord.gridFsFileId) {
            await deleteFile(mediaRecord.gridFsFileId).catch(err =>
                logger.warn(`Failed to delete note media from GridFS: ${err}`)
            );
        }

        await NoteMedia.deleteOne({ _id: mediaId });
    }
}
