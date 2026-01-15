import { useState, useEffect, memo, useCallback, useMemo, useRef } from 'react';
import {
    InsertDriveFile as FileIcon,
    FileDownload as DownloadIcon,
    FolderOpen as FolderOpenIcon,
    Delete as TrashIcon,
    FileUpload as UploadIcon,
    CheckBox as CheckSquareIcon,
    CheckBoxOutlineBlank as SquareIcon,
    IndeterminateCheckBox as XSquareIcon,
    Search as SearchIcon,
    GridView as GridViewIcon,
    PictureAsPdf as PdfIcon,
    Image as ImageIcon,
    VideoFile as VideoIcon,
    AudioFile as AudioIcon,
    Description as DocIcon,
    TableChart as SpreadsheetIcon,
    Slideshow as PresentationIcon,
    Code as CodeIcon,
    FolderZip as ArchiveIcon,
    TextSnippet as TextIcon,
    Folder as FolderIcon,
    ChevronRight as ChevronRightIcon,
    Home as HomeIcon,
    FolderShared as SharedIcon
} from '@mui/icons-material';
import { useSearchParams } from 'react-router-dom';

import {
    Box,
    Typography,
    Button,
    IconButton,
    CircularProgress,
    Paper,
    alpha,
    useTheme,
    Grid,
    Checkbox,
    Stack,
    TextField,
    InputAdornment,
    MenuItem,
    Select,
    FormControl,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Breadcrumbs,
    Link
} from '@mui/material';
import vaultService, { type FileMetadata } from '@/services/vaultService';
import folderService, { type Folder } from '@/services/folderService';
import { motion, AnimatePresence } from 'framer-motion';
import UploadZone from '@/components/vault/UploadZone';
import { useVaultUpload, useUploadStatus } from '@/hooks/useVaultUpload';
import { useVaultDownload } from '@/hooks/useVaultDownload';
import { BackendDown } from '@/components/BackendDown';
import { ContextMenu, useContextMenu, CreateFolderIcon, RenameIcon, DeleteIcon } from '@/components/ContextMenu';
import { ImagePreviewOverlay } from '@/components/vault/ImagePreviewOverlay';
import { ShareDialog } from '@/components/sharing/ShareDialog';
import { useSessionStore } from '@/stores/sessionStore';
import { useFolderKeyStore } from '@/stores/useFolderKeyStore';
import { generateFolderKey, wrapKey } from '@/lib/cryptoUtils';
import { Share as ShareIcon } from '@mui/icons-material';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';



function formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}



// Get file icon and color based on extension
function getFileIconInfo(fileName: string): { icon: React.ElementType; color: string } {
    const ext = fileName.split('.').pop()?.toLowerCase() || '';

    // PDF
    if (ext === 'pdf') return { icon: PdfIcon, color: '#E53935' };

    // Images
    if (['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp', 'bmp', 'ico'].includes(ext))
        return { icon: ImageIcon, color: '#43A047' };

    // Videos
    if (['mp4', 'mkv', 'avi', 'mov', 'wmv', 'webm', 'flv'].includes(ext))
        return { icon: VideoIcon, color: '#8E24AA' };

    // Audio
    if (['mp3', 'wav', 'flac', 'aac', 'ogg', 'm4a', 'wma'].includes(ext))
        return { icon: AudioIcon, color: '#FB8C00' };

    // Documents (Word)
    if (['doc', 'docx', 'odt', 'rtf'].includes(ext))
        return { icon: DocIcon, color: '#1E88E5' };

    // Spreadsheets
    if (['xls', 'xlsx', 'csv', 'ods'].includes(ext))
        return { icon: SpreadsheetIcon, color: '#2E7D32' };

    // Presentations
    if (['ppt', 'pptx', 'odp', 'key'].includes(ext))
        return { icon: PresentationIcon, color: '#D84315' };

    // Code files
    if (['js', 'ts', 'jsx', 'tsx', 'py', 'java', 'cpp', 'c', 'h', 'cs', 'go', 'rs', 'rb', 'php', 'html', 'css', 'scss', 'json', 'xml', 'yaml', 'yml', 'sh', 'bash', 'sql'].includes(ext))
        return { icon: CodeIcon, color: '#00ACC1' };

    // Archives
    if (['zip', 'rar', '7z', 'tar', 'gz', 'bz2', 'xz'].includes(ext))
        return { icon: ArchiveIcon, color: '#6D4C41' };

    // Text files
    if (['txt', 'md', 'log', 'ini', 'cfg'].includes(ext))
        return { icon: TextIcon, color: '#757575' };

    // Default
    return { icon: FileIcon, color: '#29B6F6' };
}

type ViewPreset = 'compact' | 'standard' | 'comfort' | 'detailed';

export function FilesPage() {
    const [searchParams] = useSearchParams();
    const currentView = searchParams.get('view');
    const [files, setFiles] = useState<FileMetadata[]>([]);
    const [folders, setFolders] = useState<Folder[]>([]);
    const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);

    const [folderPath, setFolderPath] = useState<Folder[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [, setError] = useState<string | null>(null);
    const [downloadingId, setDownloadingId] = useState<string | null>(null);
    const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [showUpload, setShowUpload] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [viewPreset, setViewPreset] = useState<ViewPreset>('standard');
    const [backendError, setBackendError] = useState(false);
    const [newFolderDialog, setNewFolderDialog] = useState(false);
    const [newFolderName, setNewFolderName] = useState('');
    const [renameFolderDialog, setRenameFolderDialog] = useState<{ open: boolean; folder: Folder | null }>({ open: false, folder: null });
    const [moveToFolderDialog, setMoveToFolderDialog] = useState(false);
    const [filesToMove, setFilesToMove] = useState<string[]>([]);
    const [dragOverId, setDragOverId] = useState<string | null>(null);
    const [isExternalDragging, setIsExternalDragging] = useState(false);
    const [previewOpen, setPreviewOpen] = useState(false);
    const [previewInitialId, setPreviewInitialId] = useState<string | null>(null);

    // Share Dialog State
    const [shareDialog, setShareDialog] = useState<{
        open: boolean;
        item: FileMetadata | Folder | null;
        type: 'file' | 'folder';
    }>({ open: false, item: null, type: 'folder' });
    const [displayLimit, setDisplayLimit] = useState(20);

    // Delete confirmation states
    const [deleteConfirm, setDeleteConfirm] = useState<{
        open: boolean;
        type: 'file' | 'mass' | 'folder';
        id?: string;
        count?: number;
    }>({ open: false, type: 'file' });
    const [isDeleting, setIsDeleting] = useState(false);

    const sentinelRef = useRef<HTMLDivElement>(null);
    const { uploadFiles } = useVaultUpload();
    const uploadStatus = useUploadStatus(); // Using specialized status-only hook
    const { downloadAndDecrypt } = useVaultDownload();
    const { contextMenu, handleContextMenu, closeContextMenu } = useContextMenu();
    const theme = useTheme();
    const isImageFile = (file: FileMetadata) => file.mimeType?.startsWith('image/');

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

            setError(null);
        } catch (err) {
            console.error('Failed to fetch files:', err);
            setBackendError(true);
            setError('Failed to load files');
        } finally {
            setIsLoading(false);
        }
    }, [currentFolderId]);

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

    const handleDelete = useCallback(async (fileId: string) => {
        setDeleteConfirm({ open: true, type: 'file', id: fileId });
    }, []);

    const confirmDeleteFile = async () => {
        if (!deleteConfirm.id) return;
        setIsDeleting(true);
        try {
            setDeletingIds(prev => new Set(prev).add(deleteConfirm.id!));
            await vaultService.deleteFile(deleteConfirm.id);
            setFiles(files => files.filter(f => f._id !== deleteConfirm.id));
            setSelectedIds(prev => {
                const next = new Set(prev);
                next.delete(deleteConfirm.id!);
                return next;
            });
        } catch (err) {
            console.error('Delete failed:', err);
        } finally {
            setDeletingIds(prev => {
                const next = new Set(prev);
                next.delete(deleteConfirm.id!);
                return next;
            });
            setIsDeleting(false);
            setDeleteConfirm({ open: false, type: 'file' });
        }
    };

    const handleMassDelete = async () => {
        if (selectedIds.size === 0) return;
        setDeleteConfirm({ open: true, type: 'mass', count: selectedIds.size });
    };

    const confirmMassDelete = async () => {
        setIsDeleting(true);
        for (const id of Array.from(selectedIds)) {
            try {
                setDeletingIds(prev => new Set(prev).add(id));
                await vaultService.deleteFile(id);
                setFiles(prev => prev.filter(f => f._id !== id));
            } catch (err) {
                console.error(`Failed to delete ${id}:`, err);
            } finally {
                setDeletingIds(prev => {
                    const next = new Set(prev);
                    next.delete(id);
                    return next;
                });
            }
        }
        setSelectedIds(new Set());
        setIsDeleting(false);
        setDeleteConfirm({ open: false, type: 'file' });
    };

    const toggleSelect = useCallback((id: string) => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    }, []);

    const selectAll = useCallback(() => {
        setSelectedIds(prev => {
            if (prev.size === files.length) return new Set();
            return new Set(files.map(f => f._id));
        });
    }, [files.length]);

    // Natural sort helper for proper numeric ordering (1, 2, 10 instead of 1, 10, 2)
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


    // Filter for image files only (for the gallery) - already sorted from filteredFiles
    const imageFiles = useMemo(() => filteredFiles.filter(f => f.mimeType?.startsWith('image/')), [filteredFiles]);

    // Handle file card click
    const handleFileClick = useCallback((file: FileMetadata, e: React.MouseEvent) => {
        // If holding Ctrl/Cmd, always do selection
        if (e.ctrlKey || e.metaKey) {
            toggleSelect(file._id);
            return;
        }

        // If it's an image, open the preview
        if (isImageFile(file)) {
            setPreviewInitialId(file._id);
            setPreviewOpen(true);
        } else {
            // For non-images, toggle selection
            toggleSelect(file._id);
        }
    }, [toggleSelect, isImageFile]);

    const gridSize = useMemo(() => {
        switch (viewPreset) {
            case 'compact': return { xs: 6, sm: 4, md: 3, lg: 2 };
            case 'comfort': return { xs: 12, sm: 6, md: 4, lg: 3 };
            case 'detailed': return { xs: 12, sm: 12, md: 6, lg: 4 };
            default: return { xs: 6, sm: 4, md: 3, lg: 2.4 }; // Standard (5 items per row on large)
        }
    }, [viewPreset]);

    const iconScaling = useMemo(() => {
        switch (viewPreset) {
            case 'compact': return { size: 48, padding: 1.5, badge: 14 };
            case 'comfort': return { size: 80, padding: 2.5, badge: 20 };
            case 'detailed': return { size: 64, padding: 3.5, badge: 24 };
            default: return { size: 64, padding: 2, badge: 18 }; // Standard
        }
    }, [viewPreset]);

    const typoScaling = useMemo(() => {
        switch (viewPreset) {
            case 'compact': return { name: 'caption', size: 11, mb: 0.5 };
            case 'comfort': return { name: 'body1', size: 24, mb: 1 };
            case 'detailed': return { name: 'h6', size: 30, mb: 1.5 };
            default: return { name: 'body2', size: 16, mb: 1 }; // Standard
        }
    }, [viewPreset]);

    useEffect(() => {
        fetchData();
        setDisplayLimit(40); // Reset limit when folder changes
    }, [currentFolderId, fetchData]);

    // Lazy load observer
    useEffect(() => {
        const observer = new IntersectionObserver((entries) => {
            if (entries[0].isIntersecting) {
                setDisplayLimit(prev => prev + 20);
            }
        }, { threshold: 0.1 });

        const currentSentinel = sentinelRef.current;
        if (currentSentinel) {
            observer.observe(currentSentinel);
        }

        return () => {
            if (currentSentinel) {
                observer.unobserve(currentSentinel);
            }
        };
    }, [filteredFiles.length]);

    // Refresh file list when an upload completes
    useEffect(() => {
        if (uploadStatus === 'completed') {
            fetchData();
        }
    }, [uploadStatus, fetchData]);

    // Folder handlers
    const handleCreateFolder = async () => {
        if (!newFolderName.trim()) return;

        const { user } = useSessionStore.getState();
        const masterKey = user?.vaultKey;

        if (!masterKey) {
            alert('Vault keys not ready. Please wait or log in again.');
            return;
        }

        try {
            // 1. Generate Folder Key (AES-GCM 256)
            const folderKey = await generateFolderKey();

            // 2. Wrap Folder Key with Master Key
            const encryptedSessionKey = await wrapKey(folderKey, masterKey);

            // 3. Create folder on backend
            const newFolder = await folderService.createFolder(
                newFolderName.trim(),
                currentFolderId,
                encryptedSessionKey
            );

            // 4. Store decrypted key in memory
            useFolderKeyStore.getState().setKey(newFolder._id, folderKey);

            setNewFolderName('');
            setNewFolderDialog(false);
            fetchData();
        } catch (err) {
            console.error('Failed to create folder:', err);
            alert('Failed to create secure folder. Please try again.');
        }
    };

    const handleRenameFolder = async () => {
        if (!renameFolderDialog.folder || !newFolderName.trim()) return;
        try {
            await folderService.renameFolder(renameFolderDialog.folder._id, newFolderName.trim());
            setNewFolderName('');
            setRenameFolderDialog({ open: false, folder: null });
            fetchData();
        } catch (err) {
            console.error('Failed to rename folder:', err);
        }
    };

    const handleDeleteFolder = async (folderId: string) => {
        setDeleteConfirm({ open: true, type: 'folder', id: folderId });
    };

    const confirmDeleteFolder = async () => {
        if (!deleteConfirm.id) return;
        setIsDeleting(true);
        try {
            await folderService.deleteFolder(deleteConfirm.id);
            fetchData();
        } catch (err: any) {
            alert(err.response?.data?.message || 'Failed to delete folder');
        } finally {
            setIsDeleting(false);
            setDeleteConfirm({ open: false, type: 'file' });
        }
    };

    const navigateToFolder = useCallback((folder: Folder | null) => {
        if (folder) {
            setFolderPath(prev => [...prev, folder]);
            setCurrentFolderId(folder._id);
        } else {
            setFolderPath([]);
            setCurrentFolderId(null);
        }
        setSelectedIds(new Set());
    }, []);

    const handleMoveToFolder = async (targetFolderId: string | null, idsToOverride?: string[]) => {
        const ids = idsToOverride || filesToMove;
        if (ids.length === 0) return;
        try {
            await folderService.moveFiles(ids, targetFolderId);
            setFilesToMove([]);
            setSelectedIds(new Set());
            setMoveToFolderDialog(false);
            fetchData();
        } catch (err) {
            console.error('Failed to move files:', err);
        }
    };

    // Context menu items
    const getContextMenuItems = () => {
        const targetId = contextMenu.target?.id;
        const targetType = contextMenu.target?.type;

        // File context menu
        if (targetType === 'file' && targetId) {
            return [
                {
                    label: 'Move to Folder',
                    icon: <FolderIcon fontSize="small" />,
                    onClick: () => {
                        // Collect all selected files including the right-clicked one
                        const ids = new Set(selectedIds);
                        ids.add(targetId);
                        setFilesToMove(Array.from(ids));
                        setMoveToFolderDialog(true);
                    }
                },
                {
                    label: 'Share', icon: <ShareIcon fontSize="small" />, onClick: () => {
                        const file = files.find(f => f._id === targetId);
                        if (file) setShareDialog({ open: true, item: file, type: 'file' });
                    }
                },
                {
                    label: 'Delete', icon: <DeleteIcon fontSize="small" />, onClick: () => {
                        handleDelete(targetId);
                    }
                },
            ];
        }
        // Folder context menu
        if (contextMenu.target?.type === 'folder') {
            return [
                {
                    label: 'Open', icon: <FolderOpenIcon fontSize="small" />, onClick: () => {
                        const folder = folders.find(f => f._id === contextMenu.target?.id);
                        if (folder) navigateToFolder(folder);
                    }
                },
                {
                    label: 'Rename', icon: <RenameIcon fontSize="small" />, onClick: () => {
                        const folder = folders.find(f => f._id === contextMenu.target?.id);
                        if (folder) {
                            setNewFolderName(folder.name);
                            setRenameFolderDialog({ open: true, folder });
                        }
                    }
                },
                {
                    label: 'Share', icon: <ShareIcon fontSize="small" />, onClick: () => {
                        const folder = folders.find(f => f._id === contextMenu.target?.id);
                        if (folder) setShareDialog({ open: true, item: folder, type: 'folder' });
                    }
                },
                {
                    label: 'Delete', icon: <DeleteIcon fontSize="small" />, onClick: () => {
                        if (contextMenu.target?.id) handleDeleteFolder(contextMenu.target.id);
                    }
                },
            ];
        }

        // Empty area context menu
        return [
            { label: 'New Folder', icon: <CreateFolderIcon fontSize="small" />, onClick: () => setNewFolderDialog(true) },
        ];
    };

    // Show backend error page
    if (backendError) {
        return <BackendDown onRetry={fetchData} />;
    }

    return (
        <Stack
            spacing={4}
            className="text-sharp"
            onDragEnter={(e) => {
                if (e.dataTransfer.types.includes('Files')) {
                    e.preventDefault();
                    setIsExternalDragging(true);
                }
            }}
            onDragOver={(e) => {
                if (e.dataTransfer.types.includes('Files')) {
                    e.preventDefault();
                    setIsExternalDragging(true);
                }
            }}
            sx={{ position: 'relative', minHeight: '80vh' }}
        >
            {/* External Drag Overlay */}
            <AnimatePresence>
                {isExternalDragging && (
                    <Box
                        component={motion.div}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onDragLeave={() => setIsExternalDragging(false)}
                        onDrop={async (e) => {
                            e.preventDefault();
                            setIsExternalDragging(false);
                            if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                                uploadFiles(Array.from(e.dataTransfer.files), currentFolderId);
                            }
                        }}
                        sx={{
                            position: 'fixed',
                            inset: 0,
                            zIndex: 9999,
                            bgcolor: alpha(theme.palette.primary.main, 0.08),
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            pointerEvents: 'auto',
                            border: `4px dashed ${theme.palette.primary.main}`,
                            m: 2,
                            borderRadius: '24px'
                        }}
                    >
                        <Box sx={{ textAlign: 'center', color: 'primary.main', pointerEvents: 'none' }}>
                            <UploadIcon sx={{ fontSize: 80, mb: 2 }} />
                            <Typography variant="h4" sx={{ fontWeight: 800 }}>Drop to Secure Files</Typography>
                            <Typography variant="subtitle1" sx={{ fontWeight: 600, opacity: 0.8 }}>
                                Uploading to: {currentFolderId ? folders.find(f => f._id === currentFolderId)?.name : 'Root (Home)'}
                            </Typography>
                        </Box>
                    </Box>
                )}
            </AnimatePresence>
            {/* Header */}
            <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, alignItems: { xs: 'stretch', sm: 'center' }, justifyContent: 'space-between', gap: 2 }}>
                <Box>
                    <Typography variant="h4" sx={{ display: 'flex', alignItems: 'center', gap: { xs: 1.5, sm: 2 }, fontWeight: 800, fontSize: { xs: '1.5rem', sm: '2rem' } }}>
                        <FolderOpenIcon color="primary" sx={{ fontSize: { xs: 24, sm: 32 } }} />
                        <span>Encrypted Files</span>
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5, fontWeight: 500, fontSize: { xs: '0.8rem', sm: '0.875rem' } }}>
                        {files.length} file{files.length !== 1 ? 's' : ''} in your vault
                    </Typography>
                </Box>
                <Stack direction="row" spacing={1} alignItems="center" sx={{ flexWrap: 'wrap', gap: 1 }}>
                    <AnimatePresence>
                        {selectedIds.size > 0 && (
                            <Button
                                component={motion.button}
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 20 }}
                                variant="contained"
                                color="error"
                                size="small"
                                startIcon={<TrashIcon />}
                                onClick={handleMassDelete}
                                sx={{ fontWeight: 700, borderRadius: '8px', fontSize: { xs: '0.75rem', sm: '0.875rem' } }}
                            >
                                Delete ({selectedIds.size})
                            </Button>
                        )}
                    </AnimatePresence>
                    <Button
                        variant="outlined"
                        size="small"
                        startIcon={<CreateFolderIcon />}
                        onClick={() => setNewFolderDialog(true)}
                        sx={{
                            fontWeight: 700,
                            borderRadius: '8px',
                            borderColor: alpha(theme.palette.warning.main, 0.3),
                            color: theme.palette.warning.main,
                            height: { xs: 32, sm: 36 },
                            fontSize: { xs: '0.75rem', sm: '0.875rem' },
                            px: { xs: 1.5, sm: 2 },
                            '&:hover': { borderColor: theme.palette.warning.main, bgcolor: alpha(theme.palette.warning.main, 0.05) }
                        }}
                    >
                        <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>New </Box>Folder
                    </Button>
                    <Button
                        variant="outlined"
                        size="small"
                        startIcon={<UploadIcon />}
                        onClick={() => setShowUpload(!showUpload)}
                        sx={{
                            fontWeight: 700,
                            borderRadius: '8px',
                            borderColor: alpha(theme.palette.primary.main, 0.2),
                            height: { xs: 32, sm: 36 },
                            fontSize: { xs: '0.75rem', sm: '0.875rem' },
                            px: { xs: 1.5, sm: 2 },
                            '&:hover': { borderColor: theme.palette.primary.main, bgcolor: alpha(theme.palette.primary.main, 0.05) }
                        }}
                    >
                        {showUpload ? 'Close' : 'Upload'}
                    </Button>
                </Stack>
            </Box>

            {/* View Controls & Search */}
            <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, flexWrap: 'wrap', alignItems: { xs: 'stretch', md: 'center' }, justifyContent: 'space-between', gap: 2 }}>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ xs: 'stretch', sm: 'center' }} sx={{ flex: 1, minWidth: { xs: 'auto', md: 300 } }}>
                    <TextField
                        placeholder="Search files..."
                        size="small"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        sx={{
                            flex: 1,
                            maxWidth: { xs: '100%', md: 320 },
                            '& .MuiOutlinedInput-root': {
                                borderRadius: '12px',
                                bgcolor: alpha(theme.palette.background.paper, 0.5),
                                backdropFilter: 'blur(8px)',
                                border: `1px solid ${alpha(theme.palette.divider, 0.5)}`
                            }
                        }}
                        InputProps={{
                            startAdornment: (
                                <InputAdornment position="start">
                                    <SearchIcon sx={{ color: 'text.secondary', fontSize: 20 }} />
                                </InputAdornment>
                            ),
                        }}
                    />

                    {/* Resize Control (Preset Dropdown) */}
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, letterSpacing: 0.5, whiteSpace: 'nowrap', display: { xs: 'none', sm: 'block' } }}>
                            VIEW SIZE
                        </Typography>
                        <FormControl size="small" sx={{ minWidth: { xs: '100%', sm: 130 }, flex: { xs: 1, sm: 'none' } }}>
                            <Select
                                value={viewPreset}
                                onChange={(e) => setViewPreset(e.target.value as ViewPreset)}
                                sx={{
                                    borderRadius: '10px',
                                    bgcolor: alpha(theme.palette.background.paper, 0.4),
                                    fontSize: '13px',
                                    fontWeight: 700,
                                    '& .MuiSelect-select': { py: 0.75, display: 'flex', alignItems: 'center', gap: 1 }
                                }}
                                renderValue={(value) => (
                                    <>
                                        <GridViewIcon sx={{ fontSize: 16, color: 'primary.main' }} />
                                        {value.charAt(0).toUpperCase() + value.slice(1)}
                                    </>
                                )}
                            >
                                <MenuItem value="compact" sx={{ fontSize: '13px', fontWeight: 600 }}>Compact</MenuItem>
                                <MenuItem value="standard" sx={{ fontSize: '13px', fontWeight: 600 }}>Standard</MenuItem>
                                <MenuItem value="comfort" sx={{ fontSize: '13px', fontWeight: 600 }}>Comfort</MenuItem>
                                <MenuItem value="detailed" sx={{ fontSize: '13px', fontWeight: 600 }}>Detailed</MenuItem>
                            </Select>
                        </FormControl>
                    </Box>
                </Stack>

                {files.length > 0 && (
                    <Button
                        size="small"
                        onClick={selectAll}
                        startIcon={
                            selectedIds.size === files.length ? <CheckSquareIcon color="primary" /> :
                                selectedIds.size > 0 ? <XSquareIcon /> : <SquareIcon />
                        }
                        sx={{ color: 'text.secondary', fontWeight: 600, fontSize: { xs: '12px', sm: '13px' }, alignSelf: { xs: 'flex-start', md: 'center' } }}
                    >
                        <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>{selectedIds.size === files.length ? 'Deselect All' : 'Select All'}</Box>
                        <Box component="span" sx={{ display: { xs: 'inline', sm: 'none' } }}>{selectedIds.size === files.length ? 'Deselect' : 'Select'}</Box>
                    </Button>
                )}
            </Box>

            {/* Upload Modal Overlay */}
            <Dialog
                open={showUpload}
                onClose={() => setShowUpload(false)}
                maxWidth="sm"
                fullWidth
                PaperProps={{
                    sx: {
                        borderRadius: '24px',
                        bgcolor: alpha(theme.palette.background.paper, 0.98), // Solid-ish for performance
                        border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                        backgroundImage: 'none',
                        overflow: 'hidden'
                    }
                }}
            >
                <DialogTitle sx={{ fontWeight: 800, textAlign: 'center', pt: 4 }}>
                    Secure File Upload
                </DialogTitle>
                <DialogContent sx={{ px: 4, pb: 4 }}>
                    <Typography variant="body2" sx={{ color: 'text.secondary', mb: 3, textAlign: 'center', fontWeight: 500 }}>
                        Files are encrypted locally using AES-CTR before being uploaded.
                    </Typography>
                    <UploadZone
                        folderId={currentFolderId}
                        onUploadComplete={() => {
                            // Keep modal open to show progress in the UploadManager or status in zone
                        }}
                    />
                </DialogContent>
                <DialogActions sx={{ p: 3, bgcolor: alpha(theme.palette.background.default, 0.4) }}>
                    <Button
                        onClick={() => setShowUpload(false)}
                        sx={{ fontWeight: 700, px: 4, borderRadius: '12px' }}
                    >
                        Done
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Breadcrumbs */}
            {folderPath.length > 0 && (
                <Breadcrumbs separator={<ChevronRightIcon fontSize="small" sx={{ opacity: 0.5 }} />} sx={{ mb: -2 }}>
                    <Link
                        component="button"
                        underline="hover"
                        onClick={() => navigateToFolder(null)}
                        onDragOver={(e) => {
                            e.preventDefault();
                            setDragOverId('root');
                        }}
                        onDragLeave={() => setDragOverId(null)}
                        onDrop={(e) => {
                            e.preventDefault();
                            setDragOverId(null);
                            const droppedFileId = e.dataTransfer.getData('fileId');
                            if (droppedFileId) {
                                const idsToMove = selectedIds.has(droppedFileId)
                                    ? Array.from(selectedIds)
                                    : [droppedFileId];
                                handleMoveToFolder(null, idsToMove);
                            }
                        }}
                        sx={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 0.5,
                            fontWeight: 600,
                            color: 'text.secondary',
                            p: 0.5,
                            borderRadius: '4px',
                            bgcolor: dragOverId === 'root' ? alpha(theme.palette.primary.main, 0.1) : 'transparent',
                            border: dragOverId === 'root' ? `1px solid ${theme.palette.primary.main}` : '1px solid transparent'
                        }}
                    >
                        <HomeIcon fontSize="small" />
                        Home
                    </Link>
                    {folderPath.map((folder, index) => (
                        <Link
                            key={folder._id}
                            component="button"
                            underline="hover"
                            onClick={() => {
                                setFolderPath(folderPath.slice(0, index + 1));
                                setCurrentFolderId(folder._id);
                            }}
                            onDragOver={(e) => {
                                // Don't allow dropping on the current folder (last in path)
                                if (index < folderPath.length - 1) {
                                    e.preventDefault();
                                    setDragOverId(folder._id);
                                }
                            }}
                            onDragLeave={() => setDragOverId(null)}
                            onDrop={(e) => {
                                e.preventDefault();
                                setDragOverId(null);
                                const droppedFileId = e.dataTransfer.getData('fileId');
                                if (droppedFileId) {
                                    const idsToMove = selectedIds.has(droppedFileId)
                                        ? Array.from(selectedIds)
                                        : [droppedFileId];
                                    handleMoveToFolder(folder._id, idsToMove);
                                }
                            }}
                            sx={{
                                fontWeight: 600,
                                color: index === folderPath.length - 1 ? 'text.primary' : 'text.secondary',
                                p: 0.5,
                                borderRadius: '4px',
                                bgcolor: dragOverId === folder._id ? alpha(theme.palette.primary.main, 0.1) : 'transparent',
                                border: dragOverId === folder._id ? `1px solid ${theme.palette.primary.main}` : '1px solid transparent'
                            }}
                        >
                            {folder.name}
                        </Link>
                    ))}
                </Breadcrumbs>
            )}



            {/* Files Grid */}
            {isLoading ? (
                <Box
                    sx={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        py: 12,
                        gap: 2,
                        bgcolor: alpha(theme.palette.background.paper, 0.1),
                        borderRadius: '16px',
                        border: `1px dashed ${alpha(theme.palette.divider, 0.1)}`,
                    }}
                >
                    <CircularProgress thickness={5} size={40} />
                    <Typography color="text.secondary" variant="body2" sx={{ fontWeight: 600 }}>
                        Loading secure vault...
                    </Typography>
                </Box>
            ) : (filteredFiles.length === 0 && folders.length === 0) ? (
                <Paper
                    variant="translucent"
                    sx={{ p: 10, textAlign: 'center', borderRadius: '16px' }}
                    onContextMenu={(e) => handleContextMenu(e, { type: 'empty' })}
                >
                    <FolderOpenIcon sx={{ fontSize: 64, color: 'text.secondary', opacity: 0.3, mb: 2 }} />
                    <Typography variant="h6" color="text.secondary" sx={{ fontWeight: 700 }}>No files match your criteria</Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>Try a different search term or upload a new file</Typography>
                </Paper>
            ) : (
                <Grid container spacing={2} onContextMenu={(e) => handleContextMenu(e, { type: 'empty' })}>
                    {filteredFolders.map((folder) => (
                        <FolderGridItem
                            key={`folder-${folder._id}`}
                            folder={folder}
                            gridSize={gridSize}
                            iconScaling={iconScaling}
                            typoScaling={typoScaling}
                            dragOverId={dragOverId}
                            onNavigate={navigateToFolder}
                            onContextMenu={handleContextMenu}
                            onShare={(f) => setShareDialog({ open: true, item: f, type: 'folder' })}
                            onDelete={(id) => handleDeleteFolder(id)}
                            onDragOver={(id: string | null) => setDragOverId(id)}
                            onDrop={(targetId: string, droppedFileId: string) => {
                                setDragOverId(null);
                                const idsToMove = selectedIds.has(droppedFileId)
                                    ? Array.from(selectedIds)
                                    : [droppedFileId];
                                handleMoveToFolder(targetId, idsToMove);
                            }}
                        />
                    ))}

                    {filteredFiles.slice(0, displayLimit).map((file) => (
                        <FileGridItem
                            key={file._id}
                            file={file}
                            gridSize={gridSize}
                            iconScaling={iconScaling}
                            typoScaling={typoScaling}
                            isSelected={selectedIds.has(file._id)}
                            isDownloading={downloadingId === file._id}
                            isDeleting={deletingIds.has(file._id)}
                            onFileClick={handleFileClick}
                            onContextMenu={handleContextMenu}
                            onDownload={handleDownload}
                            onDelete={handleDelete}
                            onDragStart={() => { /* handled by draggable attribute */ }}
                        />
                    ))}
                </Grid>
            )}

            {/* Load More Sentinel */}
            {filteredFiles.length > displayLimit && (
                <Box ref={sentinelRef} sx={{ py: 4, display: 'flex', justifyContent: 'center' }}>
                    <CircularProgress size={24} />
                </Box>
            )}

            {/* Context Menu */}
            <ContextMenu
                open={contextMenu.open}
                anchorPosition={contextMenu.position}
                onClose={closeContextMenu}
                items={getContextMenuItems()}
            />

            {/* New Folder Dialog */}
            <Dialog
                open={newFolderDialog}
                onClose={() => setNewFolderDialog(false)}
                maxWidth="xs"
                fullWidth
                PaperProps={{ variant: 'translucent' }}
            >
                <DialogTitle sx={{ fontWeight: 700 }}>Create New Folder</DialogTitle>
                <DialogContent>
                    <TextField
                        autoFocus
                        margin="dense"
                        label="Folder Name"
                        type="text"
                        fullWidth
                        variant="outlined"
                        value={newFolderName}
                        onChange={(e) => setNewFolderName(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') handleCreateFolder(); }}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setNewFolderDialog(false)}>Cancel</Button>
                    <Button onClick={handleCreateFolder} variant="contained">Create</Button>
                </DialogActions>
            </Dialog>

            {/* Rename Folder Dialog */}
            <Dialog
                open={renameFolderDialog.open}
                onClose={() => setRenameFolderDialog({ open: false, folder: null })}
                maxWidth="xs"
                fullWidth
                PaperProps={{ variant: 'translucent' }}
            >
                <DialogTitle sx={{ fontWeight: 700 }}>Rename Folder</DialogTitle>
                <DialogContent>
                    <TextField
                        autoFocus
                        margin="dense"
                        label="Folder Name"
                        type="text"
                        fullWidth
                        variant="outlined"
                        value={newFolderName}
                        onChange={(e) => setNewFolderName(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') handleRenameFolder(); }}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setRenameFolderDialog({ open: false, folder: null })}>Cancel</Button>
                    <Button onClick={handleRenameFolder} variant="contained">Rename</Button>
                </DialogActions>
            </Dialog>

            {/* Move to Folder Dialog */}
            <Dialog
                open={moveToFolderDialog}
                onClose={() => setMoveToFolderDialog(false)}
                maxWidth="xs"
                fullWidth
                PaperProps={{ variant: 'translucent' }}
            >
                <DialogTitle sx={{ fontWeight: 700 }}>Move {selectedIds.size} file(s) to...</DialogTitle>
                <DialogContent>
                    <Stack spacing={1} sx={{ mt: 1 }}>
                        {currentFolderId && (
                            <Button
                                variant="outlined"
                                fullWidth
                                startIcon={<HomeIcon />}
                                onClick={() => handleMoveToFolder(null)}
                                sx={{ justifyContent: 'flex-start', textTransform: 'none', fontWeight: 600 }}
                            >
                                Root (Home)
                            </Button>
                        )}
                        {folders.length === 0 && !currentFolderId && (
                            <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 2 }}>
                                No folders available. Create a folder first.
                            </Typography>
                        )}
                        {filteredFolders.map(folder => (
                            <Button
                                key={folder._id}
                                variant="outlined"
                                fullWidth
                                startIcon={<FolderIcon sx={{ color: 'warning.main' }} />}
                                onClick={() => handleMoveToFolder(folder._id)}
                                sx={{ justifyContent: 'flex-start', textTransform: 'none', fontWeight: 600 }}
                            >
                                {folder.name}
                            </Button>
                        ))}
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setMoveToFolderDialog(false)}>Cancel</Button>
                </DialogActions>
            </Dialog>

            {/* Image Preview Overlay */}
            <ImagePreviewOverlay
                key={previewOpen ? `preview-${previewInitialId}` : 'preview-closed'}
                isOpen={previewOpen}
                onClose={() => setPreviewOpen(false)}
                files={imageFiles}
                initialFileId={previewInitialId || ''}
            />
            {/* Share Dialog */}
            {shareDialog.open && shareDialog.item && (
                <ShareDialog
                    open={shareDialog.open}
                    onClose={() => setShareDialog(prev => ({ ...prev, open: false, item: null }))}
                    item={shareDialog.item}
                    type={shareDialog.type}
                />
            )}

            {/* Delete Confirmation Dialog */}
            <ConfirmDialog
                open={deleteConfirm.open}
                title={
                    deleteConfirm.type === 'folder'
                        ? 'Delete Folder'
                        : deleteConfirm.type === 'mass'
                            ? 'Delete Files'
                            : 'Delete File'
                }
                message={
                    deleteConfirm.type === 'folder'
                        ? 'Are you sure you want to delete this folder? This action cannot be undone.'
                        : deleteConfirm.type === 'mass'
                            ? `Are you sure you want to delete ${deleteConfirm.count} file(s)? This action cannot be undone.`
                            : 'Are you sure you want to delete this file? This action cannot be undone.'
                }
                confirmText="Delete"
                onConfirm={() => {
                    if (deleteConfirm.type === 'file') confirmDeleteFile();
                    else if (deleteConfirm.type === 'mass') confirmMassDelete();
                    else if (deleteConfirm.type === 'folder') confirmDeleteFolder();
                }}
                onCancel={() => setDeleteConfirm({ open: false, type: 'file' })}
                isLoading={isDeleting}
                variant="danger"
            />
        </Stack>
    );
}


const FolderGridItem = memo(({
    folder,
    gridSize,
    iconScaling,
    typoScaling,
    dragOverId,
    onNavigate,
    onContextMenu,
    onShare,
    onDelete,
    onDragOver,
    onDrop
}: {
    folder: Folder;
    gridSize: any;
    iconScaling: any;
    typoScaling: any;
    dragOverId: string | null;
    onNavigate: (folder: Folder) => void;
    onContextMenu: (e: React.MouseEvent, target: any) => void;
    onShare: (folder: Folder) => void;
    onDelete: (id: string) => void;
    onDragOver: (id: string | null) => void;
    onDrop: (targetId: string, droppedFileId: string) => void;
}) => {
    const theme = useTheme();

    return (
        <Grid size={gridSize}>
            <Box style={{ height: '100%' }}>
                <Paper
                    elevation={0}
                    onClick={() => onNavigate(folder)}
                    onContextMenu={(e) => onContextMenu(e, { type: 'folder', id: folder._id })}
                    onDragOver={(e) => {
                        e.preventDefault();
                        onDragOver(folder._id);
                    }}
                    onDragLeave={() => onDragOver(null)}
                    onDrop={(e) => {
                        e.preventDefault();
                        const droppedFileId = e.dataTransfer.getData('fileId');
                        if (droppedFileId) {
                            onDrop(folder._id, droppedFileId);
                        }
                    }}
                    sx={{
                        p: 2,
                        position: 'relative',
                        cursor: 'pointer',
                        borderRadius: '24px',
                        border: dragOverId === folder._id
                            ? `2px solid ${theme.palette.primary.main}`
                            : `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                        bgcolor: dragOverId === folder._id
                            ? alpha(theme.palette.primary.main, 0.1)
                            : alpha(theme.palette.background.paper, 0.4),
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        aspectRatio: '1/1',
                        transition: 'transform 0.2s cubic-bezier(0.4, 0, 0.2, 1), background-color 0.2s, box-shadow 0.2s',
                        '&:hover': {
                            bgcolor: alpha(theme.palette.background.paper, 0.6),
                            borderColor: alpha(theme.palette.divider, 0.3),
                            transform: 'translateY(-4px)',
                            boxShadow: `0 12px 24px -8px ${alpha(theme.palette.common.black, 0.5)}`
                        }
                    }}
                >
                    <Box sx={{ mb: typoScaling.mb, filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.2))', position: 'relative' }}>
                        <FolderIcon sx={{ fontSize: iconScaling.size, color: '#FFB300' }} />
                        {folder.isSharedWithMe && (
                            <SharedIcon
                                sx={{
                                    position: 'absolute',
                                    bottom: -iconScaling.size * 0.1,
                                    right: -iconScaling.size * 0.1,
                                    fontSize: iconScaling.size * 0.5,
                                    color: 'primary.main',
                                    bgcolor: alpha(theme.palette.background.paper, 0.8),
                                    borderRadius: '50%',
                                    p: 0.2
                                }}
                            />
                        )}
                    </Box>

                    <Typography
                        variant={typoScaling.name as any}
                        sx={{
                            fontWeight: 700,
                            color: 'text.primary',
                            width: '100%',
                            textAlign: 'center',
                            px: 1,
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden',
                            lineHeight: 1.2,
                            wordBreak: 'break-word'
                        }}
                    >
                        {folder.name}
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'text.secondary', opacity: 0.7, mb: 1 }}>
                        Folder
                    </Typography>

                    <Stack
                        direction="row"
                        spacing={1}
                        justifyContent="center"
                        onClick={e => e.stopPropagation()}
                    >
                        <IconButton
                            size="small"
                            onClick={() => onShare(folder)}
                            sx={{
                                color: 'primary.main',
                                p: 0.5,
                                '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.1) }
                            }}
                        >
                            <ShareIcon fontSize="small" />
                        </IconButton>
                        <IconButton
                            size="small"
                            onClick={() => onDelete(folder._id)}
                            sx={{
                                color: '#EF5350',
                                p: 0.5,
                                '&:hover': { bgcolor: alpha('#EF5350', 0.1) }
                            }}
                        >
                            <TrashIcon fontSize="small" />
                        </IconButton>
                    </Stack>
                </Paper>
            </Box>
        </Grid>
    );
});

const FileGridItem = memo(({
    file,
    gridSize,
    iconScaling,
    typoScaling,
    isSelected,
    isDownloading,
    isDeleting,
    onFileClick,
    onContextMenu,
    onDownload,
    onDelete,
    onDragStart
}: {
    file: FileMetadata;
    gridSize: any;
    iconScaling: any;
    typoScaling: any;
    isSelected: boolean;
    isDownloading: boolean;
    isDeleting: boolean;
    onFileClick: (file: FileMetadata, e: React.MouseEvent) => void;
    onContextMenu: (e: React.MouseEvent, target: any) => void;
    onDownload: (file: FileMetadata) => void;
    onDelete: (id: string) => void;
    onDragStart: (id: string) => void;
}) => {
    const theme = useTheme();
    const { icon: FileTypeIcon, color } = getFileIconInfo(file.originalFileName);

    return (
        <Grid size={gridSize}>
            <Box style={{ height: '100%' }}>
                <Paper
                    elevation={0}
                    draggable
                    onDragStart={(e) => {
                        e.dataTransfer.setData('fileId', file._id);
                        onDragStart(file._id);
                    }}
                    onClick={(e) => onFileClick(file, e)}
                    onContextMenu={(e) => onContextMenu(e, { type: 'file', id: file._id })}
                    sx={{
                        p: 2,
                        position: 'relative',
                        cursor: 'grab',
                        '&:active': { cursor: 'grabbing' },
                        borderRadius: '24px',
                        border: isSelected
                            ? `2px solid ${theme.palette.primary.main}`
                            : `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                        bgcolor: isSelected
                            ? alpha(theme.palette.primary.main, 0.1)
                            : alpha(theme.palette.background.paper, 0.4),
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        aspectRatio: '1/1',
                        transition: 'transform 0.2s cubic-bezier(0.4, 0, 0.2, 1), background-color 0.2s, box-shadow 0.2s',
                        '&:hover': {
                            bgcolor: isSelected
                                ? alpha(theme.palette.primary.main, 0.15)
                                : alpha(theme.palette.background.paper, 0.6),
                            borderColor: isSelected ? theme.palette.primary.main : alpha(theme.palette.divider, 0.3),
                            transform: 'translateY(-4px)',
                            boxShadow: `0 12px 24px -8px ${alpha(theme.palette.common.black, 0.5)}`
                        }
                    }}
                >
                    <Box sx={{ position: 'absolute', top: 12, left: 12, opacity: isSelected ? 1 : 0, transition: 'opacity 0.2s' }}>
                        <Checkbox
                            checked={isSelected}
                            size="small"
                            sx={{ p: 0, color: theme.palette.primary.main }}
                        />
                    </Box>

                    <Box sx={{ mb: typoScaling.mb, filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.2))' }}>
                        <FileTypeIcon sx={{ fontSize: iconScaling.size, color: color }} />
                    </Box>

                    <Typography
                        variant={typoScaling.name as any}
                        sx={{
                            fontWeight: 700,
                            color: 'text.primary',
                            width: '100%',
                            textAlign: 'center',
                            px: 1,
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden',
                            lineHeight: 1.2,
                            wordBreak: 'break-word'
                        }}
                        title={file.originalFileName}
                    >
                        {file.originalFileName}
                    </Typography>

                    <Typography variant="caption" sx={{ color: 'text.secondary', opacity: 0.7, mb: 1 }}>
                        {formatFileSize(file.fileSize)}
                    </Typography>

                    <Stack
                        direction="row"
                        spacing={1}
                        justifyContent="center"
                        onClick={e => e.stopPropagation()}
                    >
                        <IconButton
                            size="small"
                            onClick={() => onDownload(file)}
                            disabled={isDownloading}
                            sx={{
                                color: '#29B6F6',
                                p: 0.5,
                                '&:hover': { bgcolor: alpha('#29B6F6', 0.1) }
                            }}
                        >
                            {isDownloading ? <CircularProgress size={20} /> : <DownloadIcon fontSize="small" />}
                        </IconButton>
                        <IconButton
                            size="small"
                            onClick={() => onDelete(file._id)}
                            disabled={isDeleting}
                            sx={{
                                color: '#EF5350',
                                p: 0.5,
                                '&:hover': { bgcolor: alpha('#EF5350', 0.1) }
                            }}
                        >
                            {isDeleting ? <CircularProgress size={20} /> : <TrashIcon fontSize="small" />}
                        </IconButton>
                    </Stack>
                </Paper>
            </Box>
        </Grid>
    );
});

