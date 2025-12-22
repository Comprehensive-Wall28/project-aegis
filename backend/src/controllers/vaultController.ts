import { Request, Response } from 'express';
import FileMetadata from '../models/FileMetadata';
import { initiateGoogleDriveUpload } from '../services/googleDriveService';

interface AuthRequest extends Request {
    user?: any;
}

export const uploadInit = async (req: AuthRequest, res: Response) => {
    try {
        const { fileName, fileSize, encryptedSymmetricKey, mimeType } = req.body;

        if (!fileName || !fileSize || !encryptedSymmetricKey || !mimeType) {
            return res.status(400).json({ message: 'Missing file metadata' });
        }

        if (!req.user || !req.user.id) {
            return res.status(401).json({ message: 'User not authenticated' });
        }

        // Initiate Upload with Google
        // We use the encrypted filename or a generated one for Google Drive to avoid leaking info?
        // Requirement: "fileName (encrypted)". The DB stores encrypted name.
        // Should Google Drive see the plain name? "Backend must never receive file in plaintext".
        // Usually metadata like filename `payroll.pdf` leaks info. 
        // Secure approach: Store `uuid.enc` or just the `fileName` (which is already encrypted per schema) on Google Drive.
        // I will pass the `fileName` (which client says is encrypted) to Google Drive.

        // Catch: If checking `process.env.GOOGLE_APPLICATION_CREDENTIALS` fails/empty during init, it throws.
        // I should wrap this.

        // Note: If no creds configured, we can't get URL.
        try {
            const uploadUrl = await initiateGoogleDriveUpload(fileName, mimeType);

            // Create DB Entry as Pending
            const fileRecord = await FileMetadata.create({
                ownerId: req.user.id,
                fileName,
                fileSize,
                encryptedSymmetricKey,
                mimeType,
                status: 'pending' // pending completion of upload
                // googleDriveFileId is unknown until update, OR we can parse it from uploadUrl if needed, 
                // but actually Google doesn't give ID until upload completes usually? 
                // Wait, Resumable session usually targets a placeholder file?
                // "The response to the initial request includes the file ID in the body... if it was created?"
                // Actually for 'create' it creates a file stub.
                // Let's check my service implementation. It returns Location header.
            });

            // We return the URL + the fileID (our DB ID).
            // The client uploads to URL.
            // Client should then call a "finalize" endpoint? 
            // Or we rely on the client to trust it's done? 
            // Better: Client calls `POST /api/vault/upload-complete` (not in requirements but good practice).
            // Requirement only asks for `upload-init`. I will provide that.

            res.status(200).json({
                uploadUrl,
                fileId: fileRecord._id
            });

        } catch (gError) {
            console.error("Google Drive Init Failed:", gError);
            // Fallback for dev/demo if no creds:
            // return res.status(503).json({ message: 'Vault service unavailable (Check credentials)' });
            return res.status(500).json({ message: 'Failed to initiate vault upload' });
        }

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

export const getUserFiles = async (req: AuthRequest, res: Response) => {
    try {
        if (!req.user || !req.user.id) {
            return res.status(401).json({ message: 'User not authenticated' });
        }

        const files = await FileMetadata.find({ ownerId: req.user.id }).sort({ createdAt: -1 });
        res.json(files);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};
