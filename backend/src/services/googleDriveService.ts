import { google, drive_v3 } from 'googleapis';
import { Readable } from 'stream';
import { OAuth2Client } from 'google-auth-library';
import logger from '../utils/logger';

// Types for upload sessions
interface UploadSession {
    sessionUrl: string;
    totalSize: number;
    receivedSize: number;
    fileName: string;
    metadata: Record<string, any>;
}

const activeUploads: Map<string, UploadSession> = new Map();

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

    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;

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
    const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
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
 * Initiate a resumable upload session with Google Drive.
 * @param fileName - The file name to store
 * @param totalSize - Total expected file size in bytes
 * @param metadata - Optional metadata including PQC encryption keys
 * @returns A unique session ID for tracking the upload
 */
export const initiateUpload = async (
    fileName: string,
    totalSize: number,
    metadata?: Record<string, any>
): Promise<string> => {
    const drive = initializeDriveClient();
    const folderId = getFolderId();
    const sessionId = generateSessionId();

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
    const initResponse = await fetch(
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

    // Store session info
    const session: UploadSession = {
        sessionUrl,
        totalSize,
        receivedSize: 0,
        fileName,
        metadata: metadata || {}
    };

    activeUploads.set(sessionId, session);

    logger.info(`Google Drive upload initiated: sessionId=${sessionId}, fileName=${fileName}, totalSize=${totalSize}`);
    return sessionId;
};

/**
 * Append a chunk to an active upload session using resumable upload protocol.
 * @param sessionId - The upload session ID
 * @param chunk - The chunk data as Buffer
 * @param rangeStart - Start byte position
 * @param rangeEnd - End byte position
 * @param totalSize - Total expected file size
 * @returns Upload progress info
 */
export const appendChunk = async (
    sessionId: string,
    chunk: Buffer,
    rangeStart: number,
    rangeEnd: number,
    totalSize: number
): Promise<{ complete: boolean; receivedSize: number }> => {
    const session = activeUploads.get(sessionId);

    if (!session) {
        throw new Error(`Upload session not found: ${sessionId}`);
    }

    // Update received size
    session.receivedSize += chunk.length;

    // Perform PUT request with Content-Range header
    const response = await fetch(session.sessionUrl, {
        method: 'PUT',
        headers: {
            'Content-Length': String(chunk.length),
            'Content-Range': `bytes ${rangeStart}-${rangeEnd}/${totalSize}`
        },
        body: new Uint8Array(chunk)
    });

    logger.info(`Google Drive chunk uploaded: sessionId=${sessionId}, chunkSize=${chunk.length}, received=${session.receivedSize}/${totalSize}, status=${response.status}`);

    // 200 or 201 means upload complete
    if (response.status === 200 || response.status === 201) {
        return { complete: true, receivedSize: session.receivedSize };
    }

    // 308 means upload incomplete, continue
    if (response.status === 308) {
        return { complete: false, receivedSize: session.receivedSize };
    }

    // Handle errors
    const errorText = await response.text();
    throw new Error(`Chunk upload failed: ${response.status} - ${errorText}`);
};

/**
 * Finalize an upload session and retrieve the Google Drive file ID.
 * @param sessionId - The upload session ID
 * @returns The Google Drive file ID
 */
export const finalizeUpload = async (sessionId: string): Promise<string> => {
    const session = activeUploads.get(sessionId);

    if (!session) {
        throw new Error(`Upload session not found: ${sessionId}`);
    }

    // Query the session URL to get the file info
    const response = await fetch(session.sessionUrl, {
        method: 'PUT',
        headers: {
            'Content-Length': '0',
            'Content-Range': `bytes */${session.totalSize}`
        }
    });

    if (response.status === 200 || response.status === 201) {
        const fileData = await response.json() as drive_v3.Schema$File;
        const fileId = fileData.id;

        if (!fileId) {
            throw new Error('No file ID returned from Google Drive');
        }

        logger.info(`Google Drive upload finalized: sessionId=${sessionId}, fileId=${fileId}`);
        activeUploads.delete(sessionId);
        return fileId;
    }

    // 308 means still incomplete - check the Range header
    if (response.status === 308) {
        const range = response.headers.get('range');
        logger.warn(`Upload incomplete during finalize: sessionId=${sessionId}, range=${range}`);
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

    logger.info(`Google Drive download stream opened: fileId=${fileId}`);
    return response.data as Readable;
};

/**
 * Delete a file from Google Drive.
 * @param fileId - The Google Drive file ID
 */
export const deleteFile = async (fileId: string): Promise<void> => {
    const drive = initializeDriveClient();
    await drive.files.delete({ fileId, supportsAllDrives: true });
    logger.info(`Google Drive file deleted: fileId=${fileId}`);
};

/**
 * Cancel an active upload session and cleanup.
 * @param sessionId - The upload session ID
 */
export const cancelUpload = async (sessionId: string): Promise<void> => {
    const session = activeUploads.get(sessionId);
    if (session) {
        // Try to cancel the resumable upload (optional, will expire on its own after 1 week)
        try {
            await fetch(session.sessionUrl, {
                method: 'DELETE'
            });
        } catch (error) {
            // Ignore errors when cancelling
            logger.warn(`Failed to cancel Google Drive upload: sessionId=${sessionId}`);
        }
        activeUploads.delete(sessionId);
        logger.info(`Google Drive upload cancelled: sessionId=${sessionId}`);
    }
};

/**
 * Check if an upload session exists and is active
 */
export const isUploadActive = (sessionId: string): boolean => {
    return activeUploads.has(sessionId);
};

/**
 * Get the session URL for an active upload (used by controller for resuming)
 */
export const getSessionUrl = (sessionId: string): string | null => {
    const session = activeUploads.get(sessionId);
    return session ? session.sessionUrl : null;
};
