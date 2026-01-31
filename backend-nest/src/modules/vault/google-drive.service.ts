import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { google, drive_v3 } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { Readable } from 'stream';

// Types for upload sessions
interface UploadSession {
    sessionUrl: string;
    totalSize: number;
    receivedSize: number;
    fileName: string;
    metadata: Record<string, any>;
}

@Injectable()
export class GoogleDriveService {
    private driveClient: drive_v3.Drive | null = null;
    private oauth2Client: OAuth2Client | null = null;
    private readonly activeUploads: Map<string, UploadSession> = new Map();
    private readonly logger = new Logger(GoogleDriveService.name);

    constructor(private readonly configService: ConfigService) { }

    /**
     * Initialize the Google Drive client using OAuth2 with refresh token
     */
    private initializeClient(): drive_v3.Drive {
        if (this.driveClient && this.oauth2Client) {
            return this.driveClient;
        }

        const clientId = this.configService.get<string>('GOOGLE_CLIENT_ID');
        const clientSecret = this.configService.get<string>('GOOGLE_CLIENT_SECRET');
        const refreshToken = this.configService.get<string>('GOOGLE_REFRESH_TOKEN');

        if (!clientId || !clientSecret || !refreshToken) {
            throw new Error('Missing OAuth2 credentials: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and GOOGLE_REFRESH_TOKEN are required');
        }

        this.oauth2Client = new google.auth.OAuth2(clientId, clientSecret);
        this.oauth2Client.setCredentials({ refresh_token: refreshToken });

        this.driveClient = google.drive({ version: 'v3', auth: this.oauth2Client });
        this.logger.log('Google Drive client initialized with OAuth2');
        return this.driveClient;
    }

    private getFolderId(): string {
        const folderId = this.configService.get<string>('GOOGLE_DRIVE_FOLDER_ID');
        if (!folderId) {
            throw new Error('GOOGLE_DRIVE_FOLDER_ID environment variable is not set');
        }
        return folderId;
    }

    private generateSessionId(): string {
        return `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
    }

    /**
     * Initiate a resumable upload session
     */
    async initiateUpload(
        fileName: string,
        totalSize: number,
        metadata?: Record<string, any>
    ): Promise<string> {
        this.initializeClient();
        const folderId = this.getFolderId();
        const sessionId = this.generateSessionId();

        // Prepare file metadata
        const fileMetadata: drive_v3.Schema$File = {
            name: fileName,
            parents: [folderId],
            appProperties: {}
        };

        if (metadata?.ownerId) {
            fileMetadata.appProperties!['ownerId'] = String(metadata.ownerId);
        }

        if (!this.oauth2Client) throw new Error('OAuth2 client not initialized');
        const accessToken = await this.oauth2Client.getAccessToken();

        const initResponse = await this.fetchWithRetry(
            'https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&supportsAllDrives=true',
            {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${accessToken.token}`,
                    'Content-Type': 'application/json; charset=UTF-8',
                    'X-Upload-Content-Length': String(totalSize)
                },
                body: JSON.stringify(fileMetadata)
            }
        );

        if (!initResponse.ok) {
            const errorText = await initResponse.text();
            throw new Error(`Failed to initiate resumable upload: ${initResponse.status} - ${errorText}`);
        }

        const sessionUrl = initResponse.headers.get('location');
        if (!sessionUrl) {
            throw new Error('No session URL returned from Google Drive');
        }

        this.activeUploads.set(sessionId, {
            sessionUrl,
            totalSize,
            receivedSize: 0,
            fileName,
            metadata: metadata || {}
        });

        return sessionId;
    }

    /**
     * Append chunk to active upload session
     */
    async appendChunk(
        sessionId: string,
        chunk: Buffer | Readable,
        chunkLength: number,
        rangeStart: number,
        rangeEnd: number,
        totalSize: number
    ): Promise<{ complete: boolean; receivedSize: number }> {
        const session = this.activeUploads.get(sessionId);
        if (!session) {
            throw new Error(`Upload session not found: ${sessionId}`);
        }

        session.receivedSize += chunkLength;

        // Perform PUT request with Content-Range header
        const response = await this.fetchWithRetry(session.sessionUrl, {
            method: 'PUT',
            headers: {
                'Content-Length': String(chunkLength),
                'Content-Range': `bytes ${rangeStart}-${rangeEnd}/${totalSize}`
            },
            body: chunk instanceof Buffer ? new Uint8Array(chunk) : (Readable.toWeb(chunk as Readable) as any),
            duplex: 'half'
        } as any);

        if (response.status === 200 || response.status === 201) {
            return { complete: true, receivedSize: session.receivedSize };
        }

        if (response.status === 308) {
            const rangeHeader = response.headers.get('range');
            if (rangeHeader) {
                const match = rangeHeader.match(/bytes=0-(\d+)/);
                if (match) {
                    session.receivedSize = parseInt(match[1], 10) + 1;
                }
            }
            return { complete: false, receivedSize: session.receivedSize };
        }

        const errorText = await response.text();
        throw new Error(`Chunk upload failed: ${response.status} - ${errorText}`);
    }

    /**
     * Finalize upload and get file ID
     */
    async finalizeUpload(sessionId: string): Promise<string> {
        const session = this.activeUploads.get(sessionId);
        if (!session) {
            throw new Error(`Upload session not found: ${sessionId}`);
        }

        const response = await this.fetchWithRetry(session.sessionUrl, {
            method: 'PUT',
            headers: {
                'Content-Length': '0',
                'Content-Range': `bytes */${session.totalSize}`
            }
        });

        if (response.status === 200 || response.status === 201) {
            const fileData = await response.json() as drive_v3.Schema$File;
            const fileId = fileData.id;

            if (!fileId) throw new Error('No file ID returned from Google Drive');

            this.activeUploads.delete(sessionId);
            return fileId;
        }

        if (response.status === 308) {
            throw new Error('Upload incomplete during finalization');
        }

        const errorText = await response.text();
        throw new Error(`Finalize upload failed: ${response.status} - ${errorText}`);
    }

    /**
     * Get stream for downloading file
     */
    async getFileStream(fileId: string): Promise<Readable> {
        const drive = this.initializeClient();
        const response = await drive.files.get(
            { fileId, alt: 'media', supportsAllDrives: true },
            { responseType: 'stream' }
        );
        return response.data as Readable;
    }

    /**
     * Delete file from Google Drive
     */
    async deleteFile(fileId: string): Promise<void> {
        const drive = this.initializeClient();
        await drive.files.delete({ fileId, supportsAllDrives: true });
    }

    /**
     * Helper with exponential backoff
     */
    private async fetchWithRetry(url: string, options: any, retries = 3, delay = 1000): Promise<Response> {
        try {
            const response = await fetch(url, options);
            if ((response.status >= 500 || response.status === 429) && retries > 0) {
                this.logger.warn(`Google Drive API request failed with ${response.status}. Retrying...`);
                await new Promise(resolve => setTimeout(resolve, delay));
                return this.fetchWithRetry(url, options, retries - 1, delay * 2);
            }
            return response;
        } catch (error) {
            if (retries > 0) {
                this.logger.warn(`Network error: ${error}. Retrying...`);
                await new Promise(resolve => setTimeout(resolve, delay));
                return this.fetchWithRetry(url, options, retries - 1, delay * 2);
            }
            throw error;
        }
    }
}
