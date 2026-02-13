import { google, drive_v3 } from 'googleapis';
import { Readable } from 'stream';
import { OAuth2Client } from 'google-auth-library';
import logger from '../utils/logger';
import { config } from '../config/env';

let driveClient: drive_v3.Drive | null = null;
let oauth2Client: OAuth2Client | null = null;

/**
 * Initialize the Google Drive client using OAuth2 with refresh token
 * Uses personal account quota instead of service account
 */
const initializeDriveClient = (): drive_v3.Drive => {
    if (driveClient && oauth2Client) {
        return driveClient;
    }

    const clientId = config.googleClientId;
    const clientSecret = config.googleClientSecret;
    const refreshToken = config.googleRefreshToken;

    if (!clientId || !clientSecret || !refreshToken) {
        throw new Error('Missing OAuth2 credentials: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and GOOGLE_REFRESH_TOKEN are required');
    }

    oauth2Client = new google.auth.OAuth2(clientId, clientSecret);
    oauth2Client.setCredentials({ refresh_token: refreshToken });

    driveClient = google.drive({ version: 'v3', auth: oauth2Client });
    logger.info('Google Drive client initialized with OAuth2');
    return driveClient;
};

/**
 * Get the target folder ID from environment variable
 */
const getFolderId = (): string => {
    const folderId = config.googleDriveFolderId;
    if (!folderId) {
        throw new Error('GOOGLE_DRIVE_FOLDER_ID environment variable is not set');
    }
    return folderId;
};

/**
 * Generate a unique session ID for tracking uploads
 */
const generateSessionId = (): string => {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
};

/**
 * Helper to perform fetch with exponential backoff retry
 */
const fetchWithRetry = async (url: string, options: any, retries = 3, delay = 1000): Promise<Response> => {
    try {
        const response = await fetch(url, options);

        // Retry on 5xx server errors or 429 too many requests
        if ((response.status >= 500 || response.status === 429) && retries > 0) {
            logger.warn(`Google Drive API request failed with ${response.status}. Retrying in ${delay}ms...`);
            await new Promise(resolve => setTimeout(resolve, delay));
            return fetchWithRetry(url, options, retries - 1, delay * 2);
        }

        return response;
    } catch (error) {
        if (retries > 0) {
            logger.warn(`Google Drive API network error: ${error}. Retrying in ${delay}ms...`);
            await new Promise(resolve => setTimeout(resolve, delay));
            return fetchWithRetry(url, options, retries - 1, delay * 2);
        }
        throw error;
    }
};

/**
 * Initiate a resumable upload session with Google Drive.
 * @param fileName - The file name to store
 * @param totalSize - Total expected file size in bytes
 * @param metadata - Optional metadata including PQC encryption keys
 * @returns Object containing session ID and URL
 */
export const initiateUpload = async (
    fileName: string,
    totalSize: number,
    metadata?: Record<string, any>
): Promise<{ sessionId: string; sessionUrl: string }> => {
    const folderId = getFolderId();
    const sessionId = generateSessionId();

    // Ensure client is initialized
    initializeDriveClient();

    // Prepare file metadata for Google Drive
    // Note: PQC keys are NOT stored in Drive appProperties due to 124 byte limit
    // They are stored in MongoDB FileMetadata instead
    const fileMetadata: drive_v3.Schema$File = {
        name: fileName,
        parents: [folderId],
        appProperties: {}
    };

    // Store only ownerId in appProperties (keys are too long for Drive's 124 byte limit)
    if (metadata && metadata.ownerId) {
        fileMetadata.appProperties!['ownerId'] = String(metadata.ownerId);
    }

    // Get access token for resumable upload
    if (!oauth2Client) {
        throw new Error('OAuth2 client not initialized');
    }
    const accessToken = await oauth2Client.getAccessToken();

    // Initiate resumable upload session (supportsAllDrives enables shared folder access)
    const initResponse = await fetchWithRetry(
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

    // Stateless - we simply return the URL to be stored by the caller (DB)
    return { sessionId, sessionUrl };
};

/**
 * Append a chunk to an active upload session using resumable upload protocol.
 * @param sessionUrl - The upload session URL
 * @param chunk - The chunk data as Buffer or Readable stream
 * @param chunkLength - Length of the chunk in bytes
 * @param rangeStart - Start byte position
 * @param rangeEnd - End byte position
 * @param totalSize - Total expected file size
 * @returns Upload progress info
 */
export const appendChunk = async (
    sessionUrl: string,
    chunk: Buffer | Readable,
    chunkLength: number,
    rangeStart: number,
    rangeEnd: number,
    totalSize: number
): Promise<{ complete: boolean; receivedSize: number }> => {
    // Perform PUT request with Content-Range header
    const response = await fetchWithRetry(sessionUrl, {
        method: 'PUT',
        headers: {
            'Content-Length': String(chunkLength),
            'Content-Range': `bytes ${rangeStart}-${rangeEnd}/${totalSize}`
        },
        body: chunk instanceof Buffer ? new Uint8Array(chunk) : (Readable.toWeb(chunk as Readable) as any),
        duplex: 'half'
    } as any);


    // 200 or 201 means upload complete
    if (response.status === 200 || response.status === 201) {
        return { complete: true, receivedSize: rangeEnd + 1 };
    }

    // 308 means upload incomplete, continue
    // Parse Range header to get actual bytes received by Google
    if (response.status === 308) {
        const rangeHeader = response.headers.get('range');
        let receivedSize = rangeEnd + 1; // Default to assuming our chunk made it if 308
        if (rangeHeader) {
            // Range header format: "bytes=0-12345"
            const match = rangeHeader.match(/bytes=0-(\d+)/);
            if (match) {
                receivedSize = parseInt(match[1], 10) + 1;
            }
        }
        return { complete: false, receivedSize };
    }

    // Handle errors
    const errorText = await response.text();
    throw new Error(`Chunk upload failed: ${response.status} - ${errorText}`);
};

/**
 * Finalize an upload session and retrieve the Google Drive file ID.
 * @param sessionUrl - The upload session URL
 * @param totalSize - Total size of the file
 * @returns The Google Drive file ID
 */
export const finalizeUpload = async (sessionUrl: string, totalSize: number): Promise<string> => {
    // Query the session URL to get the file info
    const response = await fetchWithRetry(sessionUrl, {
        method: 'PUT',
        headers: {
            'Content-Length': '0',
            'Content-Range': `bytes */${totalSize}`
        }
    });

    if (response.status === 200 || response.status === 201) {
        const fileData = await response.json() as drive_v3.Schema$File;
        const fileId = fileData.id;

        if (!fileId) {
            throw new Error('No file ID returned from Google Drive');
        }

        return fileId;
    }

    // 308 means still incomplete
    if (response.status === 308) {
        const range = response.headers.get('range');
        logger.warn(`Upload incomplete during finalize: range=${range}`);
        throw new Error('Upload incomplete during finalization');
    }

    const errorText = await response.text();
    throw new Error(`Finalize upload failed: ${response.status} - ${errorText}`);
};

/**
 * Get a readable stream for downloading a file from Google Drive.
 * @param fileId - The Google Drive file ID
 * @returns A readable stream of the file content
 */
export const getFileStream = async (fileId: string): Promise<Readable> => {
    const drive = initializeDriveClient();

    const response = await drive.files.get(
        { fileId, alt: 'media', supportsAllDrives: true },
        { responseType: 'stream' }
    );

    return response.data as Readable;
};

/**
 * Delete a file from Google Drive.
 * @param fileId - The Google Drive file ID
 */
export const deleteFile = async (fileId: string): Promise<void> => {
    const drive = initializeDriveClient();
    await drive.files.delete({ fileId, supportsAllDrives: true });
};

/**
 * Cancel an active upload session.
 * @param sessionUrl - The upload session URL
 */
export const cancelUpload = async (sessionUrl: string): Promise<void> => {
    if (sessionUrl) {
        // Try to cancel the resumable upload (optional, will expire on its own after 1 week)
        try {
            await fetch(sessionUrl, {
                method: 'DELETE'
            });
        } catch (_error) {
            // Ignore errors when cancelling
            logger.warn(`Failed to cancel Google Drive upload: sessionUrl=${sessionUrl}`);
        }
    }
};
