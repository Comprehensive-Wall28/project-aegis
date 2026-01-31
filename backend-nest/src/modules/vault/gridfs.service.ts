import { Injectable, Logger } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { GridFSBucket, ObjectId } from 'mongodb';
import { Readable, PassThrough } from 'stream';

@Injectable()
export class GridFsService {
    private buckets: Map<string, GridFSBucket> = new Map();
    private readonly logger = new Logger(GridFsService.name);

    constructor(@InjectConnection() private readonly connection: Connection) {
        // Initialize default vault bucket
        this.getBucket('vault');
    }

    /**
     * Get or create a GridFS bucket
     */
    private getBucket(bucketName: string): GridFSBucket {
        if (!this.buckets.has(bucketName)) {
            const bucket = new GridFSBucket(this.connection.db as any, { bucketName });
            this.buckets.set(bucketName, bucket);
        }
        return this.buckets.get(bucketName)!;
    }

    /**
     * Get the default vault bucket (for backward compatibility)
     */
    private get bucket(): GridFSBucket {
        return this.getBucket('vault');
    }

    /**
     * Upload a buffer to GridFS
     */
    async uploadBuffer(
        buffer: Buffer,
        filename: string,
        metadata?: Record<string, any>,
    ): Promise<ObjectId> {
        return new Promise((resolve, reject) => {
            const uploadStream = this.bucket.openUploadStream(filename, { metadata });

            uploadStream.on('finish', () => {
                resolve(uploadStream.id);
            });

            uploadStream.on('error', (error) => {
                this.logger.error(`GridFS upload error: ${error.message}`, error.stack);
                reject(error);
            });

            uploadStream.end(buffer);
        });
    }

    /**
     * Upload a stream to GridFS
     */
    async uploadStream(
        stream: Readable,
        filename: string,
        metadata?: Record<string, any>,
    ): Promise<ObjectId> {
        return new Promise((resolve, reject) => {
            const uploadStream = this.bucket.openUploadStream(filename, { metadata });

            uploadStream.on('finish', () => {
                resolve(uploadStream.id);
            });

            uploadStream.on('error', (error) => {
                this.logger.error(`GridFS upload error: ${error.message}`, error.stack);
                reject(error);
            });

            stream.pipe(uploadStream);
        });
    }

    /**
     * Download a file from GridFS to a buffer
     */
    async downloadToBuffer(fileId: ObjectId): Promise<Buffer> {
        return new Promise((resolve, reject) => {
            const downloadStream = this.bucket.openDownloadStream(fileId);
            const chunks: Buffer[] = [];

            downloadStream.on('data', (chunk) => chunks.push(chunk));

            downloadStream.on('error', (error) => {
                this.logger.error(`GridFS download error: ${error.message}`, error.stack);
                reject(error);
            });

            downloadStream.on('end', () => {
                resolve(Buffer.concat(chunks));
            });
        });
    }

    /**
     * Get a readable stream for a file
     */
    getFileStream(fileId: ObjectId): Readable {
        return this.bucket.openDownloadStream(fileId);
    }

    /**
     * Delete a file from GridFS
     */
    async deleteFile(fileId: ObjectId): Promise<void> {
        await this.bucket.delete(fileId);
    }

    /**
     * Upload a stream to a specific bucket with stream forking
     * Returns two PassThrough streams: one for client, one for caching
     */
    uploadWithFork(
        sourceStream: Readable,
        filename: string,
        bucketName: string = 'vault',
        metadata?: Record<string, any>,
    ): { clientStream: PassThrough; fileId: Promise<ObjectId> } {
        const bucket = this.getBucket(bucketName);
        const uploadStream = bucket.openUploadStream(filename, { metadata });
        
        const clientStream = new PassThrough();
        const cacheStream = new PassThrough();

        // Fork the source stream to both client and GridFS
        sourceStream.pipe(clientStream);
        sourceStream.pipe(cacheStream);
        cacheStream.pipe(uploadStream);

        const fileId = new Promise<ObjectId>((resolve, reject) => {
            uploadStream.on('finish', () => {
                resolve(uploadStream.id);
            });
            uploadStream.on('error', (error) => {
                this.logger.error(`GridFS upload error: ${error.message}`, error.stack);
                reject(error);
            });
        });

        return { clientStream, fileId };
    }

    /**
     * Get a file stream from a specific bucket
     */
    getFileStreamFromBucket(fileId: ObjectId, bucketName: string = 'vault'): Readable {
        const bucket = this.getBucket(bucketName);
        return bucket.openDownloadStream(fileId);
    }

    /**
     * Upload a buffer to a specific bucket
     */
    async uploadBufferToBucket(
        buffer: Buffer,
        filename: string,
        bucketName: string = 'vault',
        metadata?: Record<string, any>,
    ): Promise<ObjectId> {
        const bucket = this.getBucket(bucketName);
        return new Promise((resolve, reject) => {
            const uploadStream = bucket.openUploadStream(filename, { metadata });

            uploadStream.on('finish', () => {
                resolve(uploadStream.id);
            });

            uploadStream.on('error', (error) => {
                this.logger.error(`GridFS upload error: ${error.message}`, error.stack);
                reject(error);
            });

            uploadStream.end(buffer);
        });
    }

    /**
     * Delete a file from a specific bucket
     */
    async deleteFileFromBucket(fileId: ObjectId, bucketName: string = 'vault'): Promise<void> {
        const bucket = this.getBucket(bucketName);
        await bucket.delete(fileId);
    }
}
