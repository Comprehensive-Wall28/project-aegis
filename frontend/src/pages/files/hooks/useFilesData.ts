import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useSearchParams, useParams, useNavigate } from 'react-router-dom';
import vaultService, { type FileMetadata } from '@/services/vaultService';
import folderService, { type Folder } from '@/services/folderService';
import { useVaultDownload } from '@/hooks/useVaultDownload';
import { useUploadStatus } from '@/hooks/useVaultUpload';

const PAGE_SIZE = 20;

export function useFilesData() {
    const [searchParams] = useSearchParams();
    const { folderId } = useParams<{ folderId: string }>();
    const navigate = useNavigate();


    // Derived state from URL, fallback to null for root
    const currentFolderId = folderId || null;

    // Pagination State
    const [files, setFiles] = useState<FileMetadata[]>([]);
    // const [nextCursor, setNextCursor] = useState<string | null>(null); // Removed unused state
    const nextCursorRef = useRef<string | null>(null); // Ref to avoid useEffect loop
    const [hasMore, setHasMore] = useState(false);

    const [folders, setFolders] = useState<Folder[]>([]);
    const [folderPath, setFolderPath] = useState<Folder[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isLoadingMore, setIsLoadingMore] = useState(false);

    // Search State
    const [searchQuery, setSearchQuery] = useState('');
    const debouncedSearchQuery = useRef('');
    const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

    const [downloadingId, setDownloadingId] = useState<string | null>(null);

    const { downloadAndDecrypt } = useVaultDownload();
    const uploadStatus = useUploadStatus();

    // 1. Initial Fetch (Reset)
    const fetchData = useCallback(async (reset = true) => {
        // Validate folderId format immediately
        if (currentFolderId && !/^[0-9a-fA-F]{24}$/.test(currentFolderId)) {
            navigate('/404', { replace: true });
            return;
        }

        try {
            if (reset) {
                setIsLoading(true);
                // Don't clear files immediately to prevent flickering
                // setFiles([]); 
                // setNextCursor(null);
                nextCursorRef.current = null;
                setHasMore(false);
            } else {
                setIsLoadingMore(true);
            }

            // Fetch everything in parallel if resetting
            const promises: [
                Promise<{ items: FileMetadata[]; nextCursor: string | null }>,
                Promise<Folder[]>,
                Promise<Folder | null>
            ] = [
                    vaultService.getFilesPaginated({
                        folderId: currentFolderId,
                        limit: PAGE_SIZE,
                        cursor: reset ? undefined : (nextCursorRef.current || undefined),
                        search: debouncedSearchQuery.current
                    }),
                    // Only fetch folders if resetting (folders don't paginate yet or implementation is simple)
                    reset ? folderService.getFolders(currentFolderId) : Promise.resolve([]),
                    // Only fetch path if resetting
                    (reset && currentFolderId) ? folderService.getFolder(currentFolderId) : Promise.resolve(null)
                ];

            const [filesData, foldersData, currentFolder] = await Promise.all(promises);

            setFiles(prev => reset ? filesData.items : [...prev, ...filesData.items]);
            // setNextCursor(filesData.nextCursor);
            nextCursorRef.current = filesData.nextCursor;
            setHasMore(!!filesData.nextCursor);

            if (reset) {
                setFolders(foldersData);
                if (currentFolder && currentFolder.path) {
                    setFolderPath([...currentFolder.path, currentFolder]);
                } else {
                    setFolderPath([]);
                }
            }

        } catch (error: unknown) {
            console.error('Failed to fetch files:', error);
            const err = error as { response?: { status: number } };
            // Handle specific folder not found errors (e.g. from deep link)
            // If the folderId is invalid (400), not found (404), or server error (500) during fetch, we should redirect.
            if (currentFolderId && (
                !err.response ||
                err.response.status === 404 ||
                err.response.status === 400 ||
                err.response.status === 500
            )) {
                navigate('/404', { replace: true });
                return;
            }
            // Other errors (like network) are handled by global BackendStatusProvider
        } finally {
            setIsLoading(false);
            setIsLoadingMore(false);
        }
    }, [currentFolderId, navigate]); // Removed nextCursor dependency

    // Effect: Trigger fetch when Folder changes
    useEffect(() => {
        // Clear search when changing folders
        setSearchQuery('');
        debouncedSearchQuery.current = '';
        fetchData(true);
    }, [currentFolderId, fetchData]); // Safe now that fetchData doesn't depend on changing cursor

    // Effect: Handle Search Debounce
    useEffect(() => {
        if (searchTimeout.current) clearTimeout(searchTimeout.current);

        // Immediate clear if empty to restore view quickly
        if (!searchQuery && debouncedSearchQuery.current) {
            debouncedSearchQuery.current = '';
            fetchData(true);
            return;
        }

        if (searchQuery !== debouncedSearchQuery.current) {
            searchTimeout.current = setTimeout(() => {
                debouncedSearchQuery.current = searchQuery;
                fetchData(true);
            }, 500); // 500ms debounce
        }

        return () => {
            if (searchTimeout.current) clearTimeout(searchTimeout.current);
        };
    }, [searchQuery, fetchData]);

    // Load More Action
    const loadMore = useCallback(() => {
        if (!isLoadingMore && hasMore) {
            fetchData(false);
        }
    }, [isLoadingMore, hasMore, fetchData]);

    // Refresh file list when an upload completes
    useEffect(() => {
        if (uploadStatus === 'completed') {
            fetchData(true);
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

    // Client-side filtering is mostly replaced by server-side, 
    // but we can still filter folders effectively here since they aren't paginated yet
    const filteredFolders = useMemo(() => {
        let result = folders;
        if (searchQuery) { // Client side folder filtering
            result = result.filter(f => f.name.toLowerCase().includes(searchQuery.toLowerCase()));
        }
        return result;
    }, [folders, searchQuery]);

    const imageFiles = useMemo(() => files.filter(f => f.mimeType?.startsWith('image/')), [files]);

    return {
        files,
        folders,
        setFiles, // Exposed for optimistic updates
        setFolders,
        folderPath,
        isLoading,
        isLoadingMore,
        hasMore,
        loadMore,
        searchQuery,
        setSearchQuery,
        downloadingId,
        handleDownload,
        filteredFiles: files, // No more client-side filtering for files
        filteredFolders,
        imageFiles,
        currentFolderId,
        fetchData,
        searchParams
    };
}
