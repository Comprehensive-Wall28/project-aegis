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

        // We use create with a specific option to get the resumable upload URI
        // but the `create` method in googleapis usually uploads the content.
        // To get just the resumable session URI without uploading content immediately from server,
        // we need to construct a specific request or use `create` but with a stream that we don't feed?
        // Actually, googleapis `create` allows returning the config which contains the URL if we don't provide body?
        // A common pattern for "Get Upload URL" with Node.js library is tricky.
        // Easier approach: Use the `drive.files.create` to create the metadata and start the session.
        // However, the standard library tries to upload. 
        // Let's implement a manual Axios request for the initial POST if the library blocks us, 
        // OR simply try to use the library to issue the metadata request and catch the 'location' header.
        // Wait, the requirement says "returns a signed upload URL **or** handles the stream". 
        // If getting the URL is too complex with the library, passing the stream is acceptable. 
        // But "backend must never receive the file in plaintext" means if we handle stream, frontend sends .enc to us, we pipe to Google.
        // This is easier to implement reliably.
        // Let's go with: Frontend -> Backend (Stream .enc) -> Google Drive.
        // This ensures we have control and satisfies "handles the stream".
        // 
        // WAIT! I promised "Signed Upload URL" in the plan.
        // To get a Resumable Session URI: 
        // Make a POST to https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable
        // Header: Authorization: Bearer <token>
        // Body: Metadata JSON
        // Response Header: Location <--- This is the URL.

        // I can get the token from `auth.getAccessToken()`.

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

export const listFiles = async () => {
    // Defines admin listing if needed, or we rely on DB for user listing
    // This function might be useful for verification or admin
    return [];
}
