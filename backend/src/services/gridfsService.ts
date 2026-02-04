import mongoose from 'mongoose';
import { Readable, Writable, PassThrough } from 'stream';
import logger from '../utils/logger';

// Use mongoose's internal mongodb types to avoid version mismatches
const { GridFSBucket, ObjectId } = mongoose.mongo;

let bucket: any | null = null;

// In-memory store for active upload streams with proper streaming pipeline
interface UploadSession {
    passthrough: PassThrough;
    uploadStream: Writable;
    totalSize: number;
    receivedSize: number;
    finishedPromise: Promise<any>;
    error: Error | null;
    lastUpdated: number;
}

const activeStreams: Map<string, UploadSession> = new Map();

/**
 * Clean up stale upload sessions that haven't received data in a while
 * @param maxAgeMs Maximum age in milliseconds (default: 1 hour)
 */
export const cleanupStaleUploads = (maxAgeMs: number = 3600000): number => {
    const now = Date.now();
    let cleaned = 0;

    for (const [id, session] of activeStreams.entries()) {
        if (now - session.lastUpdated > maxAgeMs) {
            // Destroy stream and remove
            session.passthrough.destroy(new Error('Upload session timed out'));
            activeStreams.delete(id);
            cleaned++;
        }
    }

    if (cleaned > 0) {
        logger.info(`Cleaned up ${cleaned} stale GridFS upload sessions`);
    }

    return cleaned;
};

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
 * Initiate a new upload session with true streaming.
 * Creates a PassThrough stream piped directly to GridFS for immediate chunk processing.
 * @param fileName - The file name to store
 * @param metadata - Optional metadata to attach
 * @returns A unique stream ID for tracking
 */
export const initiateUpload = (fileName: string, metadata?: Record<string, any>): string => {
    const streamId = new ObjectId().toString();
    const gridBucket = getBucket();

    // Create PassThrough stream for backpressure handling
    const passthrough = new PassThrough({
        highWaterMark: 256 * 1024 // 256KB buffer for optimal backpressure
    });

    // Create GridFS upload stream and pipe immediately
    const uploadStream = gridBucket.openUploadStream(fileName, {
        metadata: metadata
    });

    // Set up the streaming pipeline
    passthrough.pipe(uploadStream);

    // Create a promise that resolves when upload completes
    const finishedPromise = new Promise<any>((resolve, reject) => {
        uploadStream.on('finish', () => {
            resolve(uploadStream.id);
        });
        uploadStream.on('error', (err: Error) => {
            logger.error(`GridFS upload stream error: ${err}`);
            reject(err);
        });
    });

    const session: UploadSession = {
        passthrough,
        uploadStream,
        totalSize: 0,
        receivedSize: 0,
        finishedPromise,
        error: null,
        lastUpdated: Date.now()
    };

    // Handle passthrough errors
    passthrough.on('error', (err: Error) => {
        session.error = err;
        logger.error(`GridFS passthrough error: ${err}`);
    });

    activeStreams.set(streamId, session);

    return streamId;
};

/**
 * Append a chunk to an active upload session with backpressure support.
 * Chunks are written directly to the stream pipeline, not buffered in memory.
 * @param streamId - The upload session ID
 * @param chunk - The chunk data as Buffer
 * @param rangeStart - Start byte position
 * @param rangeEnd - End byte position
 * @param totalSize - Total expected file size
 */
export const appendChunk = async (
    streamId: string,
    chunk: Buffer | Readable,
    rangeStart: number,
    rangeEnd: number,
    totalSize: number
): Promise<{ complete: boolean; receivedSize: number }> => {
    const session = activeStreams.get(streamId);

    if (!session) {
        throw new Error(`Upload session not found: ${streamId}`);
    }

    if (session.error) {
        throw session.error;
    }

    session.totalSize = totalSize;
    session.lastUpdated = Date.now();
    // session.receivedSize += chunk.length; // This doesn't work for streams

    // Write chunk with backpressure handling
    let chunkLength = 0;
    if (Buffer.isBuffer(chunk)) {
        chunkLength = chunk.length;
        session.receivedSize += chunkLength;
        const canContinue = session.passthrough.write(chunk);
        if (!canContinue) {
            await new Promise<void>((resolve) => {
                session.passthrough.once('drain', resolve);
            });
        }
    } else {
        // Stream handle
        const readable = chunk as Readable;
        readable.on('data', (data: Buffer) => {
            chunkLength += data.length;
        });

        readable.pipe(session.passthrough, { end: false });

        await new Promise<void>((resolve, reject) => {
            readable.on('end', () => {
                session.receivedSize += chunkLength;
                resolve();
            });
            readable.on('error', reject);
        });
    }


    // Check if upload is complete
    const complete = session.receivedSize >= totalSize;

    return { complete, receivedSize: session.receivedSize };
};

/**
 * Finalize an upload session.
 * Ends the stream and waits for GridFS to finish writing.
 * @param streamId - The upload session ID
 * @param fileName - The file name (unused, kept for API compatibility)
 * @param metadata - Optional metadata (unused, set during initiate)
 * @returns The GridFS file ID
 */
export const finalizeUpload = async (
    streamId: string,
    _fileName: string,
    _metadata?: Record<string, any>
): Promise<any> => {
    const session = activeStreams.get(streamId);

    if (!session) {
        throw new Error(`Upload session not found: ${streamId}`);
    }

    if (session.error) {
        activeStreams.delete(streamId);
        throw session.error;
    }

    // Signal end of data
    session.passthrough.end();

    // Wait for GridFS upload to complete
    const fileId = await session.finishedPromise;

    // Cleanup
    activeStreams.delete(streamId);

    return fileId;
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
};

/**
 * Cancel an active upload session and cleanup.
 * @param streamId - The upload session ID
 */
export const cancelUpload = (streamId: string): void => {
    const session = activeStreams.get(streamId);
    if (session) {
        // Destroy the streams to prevent memory leaks
        session.passthrough.destroy();
        activeStreams.delete(streamId);
    }
};

/**
 * Check if an upload session exists and is active
 */
export const isUploadActive = (streamId: string): boolean => {
    return activeStreams.has(streamId);
};

/**
 * Simple buffer upload for small content (e.g., notes).
 * Uploads buffer directly to GridFS without chunking session management.
 * @param buffer - The content to upload
 * @param fileName - The file name to store
 * @param metadata - Optional metadata to attach
 * @returns The GridFS file ID
 */
export const uploadBuffer = async (
    buffer: Buffer,
    fileName: string,
    metadata?: Record<string, any>
): Promise<mongoose.Types.ObjectId> => {
    const gridBucket = getBucket();

    return new Promise((resolve, reject) => {
        const uploadStream = gridBucket.openUploadStream(fileName, { metadata });

        uploadStream.on('finish', () => {
            resolve(uploadStream.id);
        });

        uploadStream.on('error', (err: Error) => {
            logger.error(`GridFS buffer upload error: ${err}`);
            reject(err);
        });

        // Write the entire buffer and end
        uploadStream.end(buffer);
    });
};

/**
 * Download a file from GridFS to a buffer.
 * Useful for small files like notes.
 * @param fileId - The GridFS file ID
 * @param maxSize - Maximum allowed size in bytes (default: 10MB)
 * @returns The file content as a Buffer
 */
export const downloadToBuffer = async (fileId: any, maxSize: number = 10 * 1024 * 1024): Promise<Buffer> => {
    const gridBucket = getBucket();
    const idString = fileId.toString();
    const id = new mongoose.mongo.ObjectId(idString);

    // Check file size first
    const files = await gridBucket.find({ _id: id }).toArray();
    if (!files || files.length === 0) {
        throw new Error(`File not found: ${idString}`);
    }

    const file = files[0];
    if (file.length > maxSize) {
        throw new Error(`File too large for buffer download: ${file.length} bytes (max: ${maxSize})`);
    }

    const stream = gridBucket.openDownloadStream(id);
    const chunks: Buffer[] = [];

    return new Promise((resolve, reject) => {
        stream.on('data', (chunk: Buffer) => chunks.push(chunk));
        stream.on('error', reject);
        stream.on('end', () => {
            resolve(Buffer.concat(chunks));
        });
    });
};
