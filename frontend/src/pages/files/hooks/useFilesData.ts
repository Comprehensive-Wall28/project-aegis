import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams, useParams, useNavigate } from 'react-router-dom';
import vaultService, { type FileMetadata } from '@/services/vaultService';
import folderService, { type Folder } from '@/services/folderService';
import { useVaultDownload } from '@/hooks/useVaultDownload';
import { useUploadStatus } from '@/hooks/useVaultUpload';

export function useFilesData() {
    const [searchParams] = useSearchParams();
    const { folderId } = useParams<{ folderId: string }>();
    const navigate = useNavigate();
    const currentView = searchParams.get('view');

    // Derived state from URL, fallback to null for root
    const currentFolderId = folderId || null;

    const [files, setFiles] = useState<FileMetadata[]>([]);
    const [folders, setFolders] = useState<Folder[]>([]);
    const [folderPath, setFolderPath] = useState<Folder[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [backendError, setBackendError] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [downloadingId, setDownloadingId] = useState<string | null>(null);

    const { downloadAndDecrypt } = useVaultDownload();
    const uploadStatus = useUploadStatus();

    const fetchData = useCallback(async () => {
        try {
            setIsLoading(true);
            setBackendError(false);
            const [filesData, foldersData] = await Promise.all([
                vaultService.getRecentFiles(currentFolderId),
                folderService.getFolders(currentFolderId)
            ]);

            setFiles(filesData);
            setFolders(foldersData);

            // If we are deep linked (have a folder ID), we need to fetch the folder details to reconstruct path
            if (currentFolderId) {
                try {
                    const currentFolder = await folderService.getFolder(currentFolderId);
                    // If the backend returns the path (ancestors), use it
                    if (currentFolder.path) {
                        setFolderPath([...currentFolder.path, currentFolder]);
                    } else {
                        // Fallback or if already set
                        if (folderPath.length === 0 || folderPath[folderPath.length - 1]._id !== currentFolderId) {
                            setFolderPath([currentFolder]);
                        }
                    }
                } catch (e: any) {
                    console.error("Failed to fetch folder details for path", e);
                    // If folder not found or invalid format, redirect to root
                    if (e.response?.status === 404 || e.response?.status === 400) {
                        setBackendError(false);
                        navigate('/dashboard/files?error=folder_not_found', { replace: true });
                        return;
                    }
                }
            } else {
                setFolderPath([]);
            }

            setError(null);
        } catch (err: any) {
            console.error('Failed to fetch files:', err);
            // Check if it was the main fetch that failed due to invalid folder ID which might bubble up
            if (err.response?.status === 404 || err.response?.status === 400) {
                navigate('/dashboard/files?error=folder_not_found', { replace: true });
                return;
            }
            setBackendError(true);
            setError('Failed to load files');
        } finally {
            setIsLoading(false);
        }
    }, [currentFolderId, navigate]); // Check dependency array, folderPath might cause issues if included but logic seems to handle it

    useEffect(() => {
        fetchData();
    }, [currentFolderId, fetchData]);

    // Refresh file list when an upload completes
    useEffect(() => {
        if (uploadStatus === 'completed') {
            fetchData();
        }
    }, [uploadStatus, fetchData]);

    const handleDownload = useCallback(async (file: FileMetadata) => {
        try {
            setDownloadingId(file._id);
            const decryptedBlob = await downloadAndDecrypt(file);
            if (!decryptedBlob) return;

            const url = window.URL.createObjectURL(decryptedBlob);
            const a = document.createElement('a');
            a.href = url;
            a.download = file.originalFileName;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } catch (err) {
            console.error('Download failed:', err);
        } finally {
            setDownloadingId(null);
        }
    }, [downloadAndDecrypt]);

    // Natural sort helper
    const naturalSort = useCallback((a: FileMetadata, b: FileMetadata) =>
        a.originalFileName.localeCompare(b.originalFileName, undefined, { numeric: true, sensitivity: 'base' }), []);

    const filteredFiles = useMemo(() => files
        .filter(f => f.originalFileName.toLowerCase().includes(searchQuery.toLowerCase()))
        .sort(naturalSort), [files, searchQuery, naturalSort]);

    const filteredFolders = useMemo(() => {
        let result = folders;
        if (currentView === 'shared' && !currentFolderId) {
            result = folders.filter(f => f.isSharedWithMe);
        }
        if (searchQuery) {
            result = result.filter(f => f.name.toLowerCase().includes(searchQuery.toLowerCase()));
        }
        return result;
    }, [folders, searchQuery, currentView, currentFolderId]);

    const imageFiles = useMemo(() => filteredFiles.filter(f => f.mimeType?.startsWith('image/')), [filteredFiles]);

    return {
        files,
        folders,
        setFiles,
        setFolders,
        folderPath,
        isLoading,
        error,
        backendError,
        searchQuery,
        setSearchQuery,
        downloadingId,
        handleDownload,
        filteredFiles,
        filteredFolders,
        imageFiles,
        currentFolderId,
        fetchData
    };
}
