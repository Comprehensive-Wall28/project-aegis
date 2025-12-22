import { google } from 'googleapis';
import path from 'path';

// Load credentials from environment or file
const SCOPES = ['https://www.googleapis.com/auth/drive.file'];

const auth = new google.auth.GoogleAuth({
    // Using environment variables or key file path
    keyFile: process.env.GOOGLE_APPLICATION_CREDENTIALS,
    scopes: SCOPES,
});

const drive = google.drive({ version: 'v3', auth });

export const initiateGoogleDriveUpload = async (name: string, mimeType: string) => {
    try {
        const fileMetadata = {
            name: name,
            parents: process.env.GOOGLE_DRIVE_FOLDER_ID ? [process.env.GOOGLE_DRIVE_FOLDER_ID] : [],
        };

        const media = {
            mimeType: mimeType,
        };

        const client = await auth.getClient();
        const accessToken = await client.getAccessToken();
        const token = accessToken.token;

        if (!token) throw new Error("Failed to get access token");

        const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
                'X-Upload-Content-Type': mimeType, // Important for the session
            },
            body: JSON.stringify(fileMetadata)
        });

        if (!response.ok) {
            throw new Error(`Google Drive API Error: ${response.statusText}`);
        }

        const uploadUrl = response.headers.get('Location');

        if (!uploadUrl) {
            throw new Error("No upload URL received from Google");
        }

        return uploadUrl;

    } catch (error) {
        console.error('Error initiating upload:', error);
        throw error;
    }
};

export const getFileStream = async (fileId: string) => {
    try {
        const file = await drive.files.get(
            { fileId: fileId, alt: 'media' },
            { responseType: 'stream' }
        );
        return file.data;
    } catch (error) {
        console.error('Error getting file stream:', error);
        throw error;
    }
};

export const listFiles = async () => {
    // Defines admin listing if needed, or we rely on DB for user listing
    // This function might be useful for verification or admin
    return [];
}
