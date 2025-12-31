import mongoose from 'mongoose';
import { Readable, Writable } from 'stream';
import logger from '../utils/logger';

// Use mongoose's internal mongodb types to avoid version mismatches
const { GridFSBucket, ObjectId } = mongoose.mongo;

let bucket: any | null = null;

// In-memory store for active upload streams
const activeStreams: Map<string, {
    stream: Writable;
    chunks: Buffer[];
    totalSize: number;
    receivedSize: number;
}> = new Map();

/**
 * Initialize GridFS bucket. Must be called after MongoDB connection is established.
 */
export const initGridFS = (): any => {
    if (!bucket) {
        const db = mongoose.connection.db;
        if (!db) {
            throw new Error('MongoDB connection not established');
        }
        bucket = new GridFSBucket(db, { bucketName: 'vault' });
        logger.info('GridFS bucket initialized');
    }
    return bucket;
};

/**
 * Get the GridFS bucket instance
 */
export const getBucket = (): any => {
    if (!bucket) {
        return initGridFS();
    }
    return bucket;
};

/**
 * Initiate a new upload session. Returns a unique stream ID for tracking.
 */
export const initiateUpload = (fileName: string, metadata?: Record<string, any>): string => {
    const streamId = new ObjectId().toString();

    activeStreams.set(streamId, {
        stream: null as any, // Will be created on finalize
        chunks: [],
        totalSize: 0,
        receivedSize: 0
    });

    logger.info(`GridFS upload initiated: streamId=${streamId}, fileName=${fileName}`);
    return streamId;
};

/**
 * Append a chunk to an active upload session.
 * @param streamId - The upload session ID
 * @param chunk - The chunk data as Buffer
 * @param rangeStart - Start byte position
 * @param rangeEnd - End byte position
 * @param totalSize - Total expected file size
 */
export const appendChunk = async (
    streamId: string,
    chunk: Buffer,
    rangeStart: number,
    rangeEnd: number,
    totalSize: number
): Promise<{ complete: boolean; receivedSize: number }> => {
    const session = activeStreams.get(streamId);

    if (!session) {
        throw new Error(`Upload session not found: ${streamId}`);
    }

    // Store the chunk
    session.chunks.push(chunk);
    session.totalSize = totalSize;
    session.receivedSize += chunk.length;

    logger.info(`GridFS chunk appended: streamId=${streamId}, chunkSize=${chunk.length}, received=${session.receivedSize}/${totalSize}`);

    // Check if upload is complete
    const complete = session.receivedSize >= totalSize;

    return { complete, receivedSize: session.receivedSize };
};

/**
 * Finalize an upload session and write all chunks to GridFS.
 * @param streamId - The upload session ID
 * @param fileName - The file name to store
 * @param metadata - Optional metadata to attach
 * @returns The GridFS file ID
 */
export const finalizeUpload = async (
    streamId: string,
    fileName: string,
    metadata?: Record<string, any>
): Promise<any> => {
    const session = activeStreams.get(streamId);

    if (!session) {
        throw new Error(`Upload session not found: ${streamId}`);
    }

    const gridBucket = getBucket();

    // Concatenate all chunks
    const fileBuffer = Buffer.concat(session.chunks);

    // Create a readable stream from the buffer
    const readableStream = new Readable();
    readableStream.push(fileBuffer);
    readableStream.push(null);

    // Upload to GridFS
    return new Promise((resolve, reject) => {
        const uploadStream = gridBucket.openUploadStream(fileName, {
            metadata: metadata
        });

        readableStream.pipe(uploadStream);

        uploadStream.on('finish', () => {
            const fileId = uploadStream.id as any;
            logger.info(`GridFS upload finalized: streamId=${streamId}, fileId=${fileId}`);

            // Cleanup
            activeStreams.delete(streamId);

            resolve(fileId);
        });

        uploadStream.on('error', (err: Error) => {
            logger.error(`GridFS upload error: ${err}`);
            activeStreams.delete(streamId);
            reject(err);
        });
    });
};

/**
 * Get a readable stream for downloading a file from GridFS.
 * @param fileId - The GridFS file ID (can be mongodb ObjectId, mongoose ObjectId, or string)
 */
export const getFileStream = (fileId: any): Readable => {
    const gridBucket = getBucket();
    // Convert to string first to handle both mongoose and mongodb ObjectId types
    const idString = fileId.toString();
    const id = new mongoose.mongo.ObjectId(idString);

    logger.info(`GridFS download stream opened: fileId=${id}`);
    return gridBucket.openDownloadStream(id);
};

/**
 * Delete a file from GridFS.
 * @param fileId - The GridFS file ID
 */
export const deleteFile = async (fileId: any): Promise<void> => {
    const gridBucket = getBucket();
    const idString = fileId.toString();
    const id = new mongoose.mongo.ObjectId(idString);

    await gridBucket.delete(id);
    logger.info(`GridFS file deleted: fileId=${id}`);
};

/**
 * Cancel an active upload session and cleanup.
 * @param streamId - The upload session ID
 */
export const cancelUpload = (streamId: string): void => {
    if (activeStreams.has(streamId)) {
        activeStreams.delete(streamId);
        logger.info(`GridFS upload cancelled: streamId=${streamId}`);
    }
};

/**
 * Check if an upload session exists and is active
 */
export const isUploadActive = (streamId: string): boolean => {
    return activeStreams.has(streamId);
};
