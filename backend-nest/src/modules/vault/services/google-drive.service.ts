import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { google, drive_v3 } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';

@Injectable()
export class GoogleDriveService implements OnModuleInit {
  private readonly logger = new Logger(GoogleDriveService.name);
  private driveClient: drive_v3.Drive;
  private oauth2Client: OAuth2Client;

  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
    const clientId = this.configService.get<string>('app.google.clientId');
    const clientSecret = this.configService.get<string>(
      'app.google.clientSecret',
    );
    const refreshToken = this.configService.get<string>(
      'app.google.refreshToken',
    );

    if (!clientId || !clientSecret || !refreshToken) {
      this.logger.warn(
        'Google Drive credentials not fully configured. Some features may not work.',
      );
      return;
    }

    this.oauth2Client = new google.auth.OAuth2(clientId, clientSecret);
    this.oauth2Client.setCredentials({ refresh_token: refreshToken });

    this.driveClient = google.drive({ version: 'v3', auth: this.oauth2Client });
    this.logger.log('Google Drive client initialized');
  }

  private async getAccessToken(): Promise<string> {
    const { token } = await this.oauth2Client.getAccessToken();
    if (!token) throw new Error('Failed to get Google access token');
    return token;
  }

  private generateSessionId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
  }

  /**
   * Helper to perform fetch with exponential backoff retry (simplified for NestJS)
   */
  private async fetchWithRetry(
    url: string,
    options: any,
    retries = 3,
    delay = 1000,
  ): Promise<Response> {
    try {
      const response = await fetch(url, options);

      // Retry on 5xx server errors or 429 too many requests
      if ((response.status >= 500 || response.status === 429) && retries > 0) {
        this.logger.warn(
          `Google Drive API request failed with ${response.status}. Retrying in ${delay}ms...`,
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
        return this.fetchWithRetry(url, options, retries - 1, delay * 2);
      }

      return response;
    } catch (error) {
      if (retries > 0) {
        this.logger.warn(
          `Google Drive API network error: ${error}. Retrying in ${delay}ms...`,
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
        return this.fetchWithRetry(url, options, retries - 1, delay * 2);
      }
      throw error;
    }
  }

  /**
   * Initiate a resumable upload session with Google Drive.
   */
  async initiateUpload(
    fileName: string,
    totalSize: number,
    metadata?: { ownerId: string },
  ): Promise<{ sessionId: string; sessionUrl: string }> {
    const folderId = this.configService.get<string>('app.google.driveFolderId');
    if (!folderId) throw new Error('GOOGLE_DRIVE_FOLDER_ID not set');

    const sessionId = this.generateSessionId();

    const fileMetadata: drive_v3.Schema$File = {
      name: fileName,
      parents: [folderId],
      appProperties: {},
    };

    if (metadata?.ownerId) {
      fileMetadata.appProperties!['ownerId'] = metadata.ownerId;
    }

    const accessToken = await this.getAccessToken();

    const response = await this.fetchWithRetry(
      'https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&supportsAllDrives=true',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json; charset=UTF-8',
          'X-Upload-Content-Length': String(totalSize),
        },
        body: JSON.stringify(fileMetadata),
      },
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Failed to initiate resumable upload: ${response.status} - ${errorText}`,
      );
    }

    const sessionUrl = response.headers.get('location');
    if (!sessionUrl) {
      throw new Error('No session URL returned from Google Drive');
    }

    return { sessionId, sessionUrl };
  }

  /**
   * Append a chunk to an active upload session using resumable upload protocol.
   */
  async appendChunk(
    sessionUrl: string,
    chunk: Buffer | any, // any to support Fastify stream
    chunkLength: number,
    rangeStart: number,
    rangeEnd: number,
    totalSize: number,
  ): Promise<{ complete: boolean; receivedSize: number }> {
    const accessToken = await this.getAccessToken();

    const response = await this.fetchWithRetry(sessionUrl, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Length': String(chunkLength),
        'Content-Range': `bytes ${rangeStart}-${rangeEnd}/${totalSize}`,
      },
      body: chunk,
      duplex: 'half',
    } as any);

    // 200 or 201 means upload complete
    if (response.status === 200 || response.status === 201) {
      return { complete: true, receivedSize: rangeEnd + 1 };
    }

    // 308 means upload incomplete, continue
    if (response.status === 308) {
      const rangeHeader = response.headers.get('range');
      let receivedSize = rangeEnd + 1;
      if (rangeHeader) {
        const match = rangeHeader.match(/bytes=0-(\d+)/);
        if (match) {
          receivedSize = parseInt(match[1], 10) + 1;
        }
      }
      return { complete: false, receivedSize };
    }

    const errorText = await response.text();
    throw new Error(`Chunk upload failed: ${response.status} - ${errorText}`);
  }

  /**
   * Finalize an upload session and retrieve the Google Drive file ID.
   */
  async finalizeUpload(sessionUrl: string, totalSize: number): Promise<string> {
    const accessToken = await this.getAccessToken();

    const response = await this.fetchWithRetry(sessionUrl, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Length': '0',
        'Content-Range': `bytes */${totalSize}`,
      },
    });

    if (response.status === 200 || response.status === 201) {
      const fileData = await response.json();
      const fileId = fileData.id;

      if (!fileId) {
        throw new Error('No file ID returned from Google Drive');
      }

      return fileId;
    }

    const errorText = await response.text();
    throw new Error(
      `Finalize upload failed: ${response.status} - ${errorText}`,
    );
  }

  /**
   * Get a readable stream for downloading a file from Google Drive.
   */
  async getFileStream(fileId: string): Promise<any> {
    if (!this.driveClient) {
      throw new Error('Google Drive client not initialized');
    }

    const response = await this.driveClient.files.get(
      { fileId, alt: 'media', supportsAllDrives: true },
      { responseType: 'stream' },
    );

    return response.data;
  }

  /**
   * Delete a file from Google Drive.
   */
  async deleteFile(fileId: string): Promise<void> {
    if (!this.driveClient) {
      throw new Error('Google Drive client not initialized');
    }

    await this.driveClient.files.delete({ fileId, supportsAllDrives: true });
  }
}
