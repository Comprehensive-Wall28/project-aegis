import { useState, useEffect, useRef } from 'react';
import { fetchAndDecryptFile } from './useVaultDownload';
import { useSessionStore } from '../stores/sessionStore';
import { type FileMetadata } from '../services/vaultService';

/**
 * Hook for managing PDF decryption and preview.
 * 
 * @param file - File metadata for the PDF to preview
 * @param isOpen - Whether the preview is currently open/visible
 */
export const usePDFPreview = (
    file: FileMetadata | null,
    isOpen: boolean
) => {
    const { user, vaultCtrKey, setCryptoStatus } = useSessionStore();
    const vaultKey = user?.vaultKey;

    // Blob URL for the current PDF
    const [blobUrl, setBlobUrl] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Keep track of the file ID to prevent stale updates
    const expectedFileIdRef = useRef<string | null>(null);

    useEffect(() => {
        if (!isOpen || !file) {
            expectedFileIdRef.current = null;
            setBlobUrl(null);
            setIsLoading(false);
            setError(null);
            return;
        }

        const fileId = file._id;
        expectedFileIdRef.current = fileId;

        // Check if keys are available
        if (!vaultCtrKey || !vaultKey) {
            setError('Vault keys not available');
            return;
        }

        // Start loading
        setBlobUrl(null);
        setIsLoading(true);
        setError(null);
        setCryptoStatus('decrypting');

        const loadPdf = async () => {
            try {
                const privateKey = user?.privateKey;
                const blob = await fetchAndDecryptFile(file, {
                    vaultCtrKey,
                    vaultKey: vaultKey as CryptoKey,
                    privateKey
                });

                // Only update if this is still the expected file
                if (expectedFileIdRef.current !== fileId) {
                    URL.revokeObjectURL(URL.createObjectURL(blob));
                    return;
                }

                const url = URL.createObjectURL(blob);
                setBlobUrl(url);
                setIsLoading(false);
                setError(null);
            } catch (err: any) {
                if (expectedFileIdRef.current !== fileId) return;

                console.error('Failed to decrypt PDF:', err);
                setError(err.message || 'Failed to decrypt PDF');
                setIsLoading(false);
            } finally {
                setCryptoStatus('idle');
            }
        };

        loadPdf();

        // Cleanup function
        return () => {
            expectedFileIdRef.current = null;
        };
    }, [isOpen, file, vaultCtrKey, vaultKey, user?.privateKey, setCryptoStatus]);

    // Cleanup when component unmounts or preview closes
    useEffect(() => {
        return () => {
            if (blobUrl) {
                URL.revokeObjectURL(blobUrl);
            }
        };
    }, [blobUrl]);

    // Cleanup when preview closes
    useEffect(() => {
        if (!isOpen && blobUrl) {
            URL.revokeObjectURL(blobUrl);
            setBlobUrl(null);
        }
    }, [isOpen, blobUrl]);

    return {
        blobUrl,
        isLoading,
        error,
    };
};
