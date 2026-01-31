import { Injectable, Logger } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { GridFSBucket, ObjectId } from 'mongodb';
import { Readable, PassThrough } from 'stream';

@Injectable()
export class GridFsService {
    private bucket: GridFSBucket;
    private readonly logger = new Logger(GridFsService.name);

    constructor(@InjectConnection() private readonly connection: Connection) {
        this.bucket = new GridFSBucket(this.connection.db as any, { bucketName: 'vault' });
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
}
