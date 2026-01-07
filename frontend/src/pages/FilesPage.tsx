import { useState, useEffect } from 'react';
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
    Home as HomeIcon
} from '@mui/icons-material';
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
    Collapse,
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
import { useVaultDownload } from '@/hooks/useVaultDownload';
import { BackendDown } from '@/components/BackendDown';
import { ContextMenu, useContextMenu, CreateFolderIcon, RenameIcon, DeleteIcon } from '@/components/ContextMenu';

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
    const [viewPreset, setViewPreset] = useState<ViewPreset>('compact');
    const [backendError, setBackendError] = useState(false);
    const [newFolderDialog, setNewFolderDialog] = useState(false);
    const [newFolderName, setNewFolderName] = useState('');
    const [renameFolderDialog, setRenameFolderDialog] = useState<{ open: boolean; folder: Folder | null }>({ open: false, folder: null });
    const [moveToFolderDialog, setMoveToFolderDialog] = useState(false);
    const [filesToMove, setFilesToMove] = useState<string[]>([]);
    const { downloadAndDecrypt } = useVaultDownload();
    const { contextMenu, handleContextMenu, closeContextMenu } = useContextMenu();
    const theme = useTheme();

    useEffect(() => {
        fetchData();
    }, [currentFolderId]);

    const fetchData = async () => {
        try {
            setIsLoading(true);
            setBackendError(false);
            const [filesData, foldersData] = await Promise.all([
                vaultService.getRecentFiles(),
                folderService.getFolders(currentFolderId)
            ]);
            // Filter files by current folder (null = root)
            const filteredFiles = filesData.filter((f: any) =>
                (currentFolderId === null && !f.folderId) || f.folderId === currentFolderId
            );
            setFiles(filteredFiles);
            setFolders(foldersData);
            setError(null);
        } catch (err) {
            console.error('Failed to fetch files:', err);
            setBackendError(true);
            setError('Failed to load files');
        } finally {
            setIsLoading(false);
        }
    };

    const handleDownload = async (file: FileMetadata) => {
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
    };

    const handleDelete = async (fileId: string) => {
        if (!confirm('Are you sure you want to delete this file?')) return;
        try {
            setDeletingIds(prev => new Set(prev).add(fileId));
            await vaultService.deleteFile(fileId);
            setFiles(files.filter(f => f._id !== fileId));
            setSelectedIds(prev => {
                const next = new Set(prev);
                next.delete(fileId);
                return next;
            });
        } catch (err) {
            console.error('Delete failed:', err);
        } finally {
            setDeletingIds(prev => {
                const next = new Set(prev);
                next.delete(fileId);
                return next;
            });
        }
    };

    const handleMassDelete = async () => {
        if (selectedIds.size === 0) return;
        if (!confirm(`Are you sure you want to delete ${selectedIds.size} file(s)?`)) return;

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
    };

    const toggleSelect = (id: string) => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const selectAll = () => {
        if (selectedIds.size === files.length) setSelectedIds(new Set());
        else setSelectedIds(new Set(files.map(f => f._id)));
    };

    const filteredFiles = files.filter(f =>
        f.originalFileName.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const getGridSize = () => {
        switch (viewPreset) {
            case 'compact': return { xs: 6, sm: 4, md: 3, lg: 2 };
            case 'comfort': return { xs: 12, sm: 6, md: 4, lg: 3 };
            case 'detailed': return { xs: 12, sm: 12, md: 6, lg: 4 };
            default: return { xs: 6, sm: 4, md: 3, lg: 2.4 }; // Standard (5 items per row on large)
        }
    };

    const getIconScaling = () => {
        switch (viewPreset) {
            case 'compact': return { size: 48, padding: 1.5, badge: 14 };
            case 'comfort': return { size: 80, padding: 2.5, badge: 20 };
            case 'detailed': return { size: 64, padding: 3.5, badge: 24 };
            default: return { size: 64, padding: 2, badge: 18 }; // Standard
        }
    };

    const getTypographyScaling = () => {
        switch (viewPreset) {
            case 'compact': return { name: 'caption', size: 11, mb: 0.5 };
            case 'comfort': return { name: 'body1', size: 24, mb: 1 };
            case 'detailed': return { name: 'h6', size: 30, mb: 1.5 };
            default: return { name: 'body2', size: 16, mb: 1 }; // Standard
        }
    };

    // Folder handlers
    const handleCreateFolder = async () => {
        if (!newFolderName.trim()) return;
        try {
            await folderService.createFolder(newFolderName.trim(), currentFolderId);
            setNewFolderName('');
            setNewFolderDialog(false);
            fetchData();
        } catch (err) {
            console.error('Failed to create folder:', err);
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
        if (!confirm('Are you sure you want to delete this folder?')) return;
        try {
            await folderService.deleteFolder(folderId);
            fetchData();
        } catch (err: any) {
            alert(err.response?.data?.message || 'Failed to delete folder');
        }
    };

    const navigateToFolder = (folder: Folder | null) => {
        if (folder) {
            setFolderPath(prev => [...prev, folder]);
            setCurrentFolderId(folder._id);
        } else {
            setFolderPath([]);
            setCurrentFolderId(null);
        }
        setSelectedIds(new Set());
    };

    const handleMoveToFolder = async (targetFolderId: string | null) => {
        if (filesToMove.length === 0) return;
        try {
            await folderService.moveFiles(filesToMove, targetFolderId);
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
        <Stack spacing={4} className="text-sharp">
            {/* Header */}
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                    <Typography variant="h4" sx={{ display: 'flex', alignItems: 'center', gap: 2, fontWeight: 800 }}>
                        <FolderOpenIcon color="primary" sx={{ fontSize: 32 }} />
                        <span>Encrypted Files</span>
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5, fontWeight: 500 }}>
                        {files.length} file{files.length !== 1 ? 's' : ''} in your vault
                    </Typography>
                </Box>
                <Stack direction="row" spacing={2} alignItems="center">
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
                                sx={{ fontWeight: 700, borderRadius: '8px' }}
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
                            height: 36,
                            '&:hover': { borderColor: theme.palette.warning.main, bgcolor: alpha(theme.palette.warning.main, 0.05) }
                        }}
                    >
                        New Folder
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
                            height: 36,
                            '&:hover': { borderColor: theme.palette.primary.main, bgcolor: alpha(theme.palette.primary.main, 0.05) }
                        }}
                    >
                        {showUpload ? 'Close' : 'Upload'}
                    </Button>
                </Stack>
            </Box>

            {/* View Controls & Search */}
            <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 3 }}>
                <Stack direction="row" spacing={3} alignItems="center" sx={{ flex: 1, minWidth: 300 }}>
                    <TextField
                        placeholder="Search files..."
                        size="small"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        sx={{
                            flex: 1,
                            maxWidth: 320,
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
                        <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, letterSpacing: 0.5, whiteSpace: 'nowrap' }}>
                            VIEW SIZE
                        </Typography>
                        <FormControl size="small" sx={{ minWidth: 130 }}>
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
                        sx={{ color: 'text.secondary', fontWeight: 600, fontSize: '13px' }}
                    >
                        {selectedIds.size === files.length ? 'Deselect All' : 'Select All'}
                    </Button>
                )}
            </Box>

            {/* Upload Section */}
            <Collapse in={showUpload}>
                <Paper variant="glass" sx={{ p: 4, borderRadius: '16px' }}>
                    <UploadZone onUploadComplete={() => {
                        fetchData();
                        setShowUpload(false);
                    }} />
                </Paper>
            </Collapse>

            {/* Breadcrumbs */}
            {folderPath.length > 0 && (
                <Breadcrumbs separator={<ChevronRightIcon fontSize="small" sx={{ opacity: 0.5 }} />} sx={{ mb: -2 }}>
                    <Link
                        component="button"
                        underline="hover"
                        onClick={() => navigateToFolder(null)}
                        sx={{ display: 'flex', alignItems: 'center', gap: 0.5, fontWeight: 600, color: 'text.secondary' }}
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
                            sx={{ fontWeight: 600, color: index === folderPath.length - 1 ? 'text.primary' : 'text.secondary' }}
                        >
                            {folder.name}
                        </Link>
                    ))}
                </Breadcrumbs>
            )}

            {/* Files Grid */}
            {isLoading ? (
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', py: 10 }}>
                    <CircularProgress thickness={5} size={40} />
                </Box>
            ) : (filteredFiles.length === 0 && folders.length === 0) ? (
                <Paper
                    variant="glass"
                    sx={{ p: 10, textAlign: 'center', borderRadius: '16px' }}
                    onContextMenu={(e) => handleContextMenu(e, { type: 'empty' })}
                >
                    <FolderOpenIcon sx={{ fontSize: 64, color: 'text.secondary', opacity: 0.3, mb: 2 }} />
                    <Typography variant="h6" color="text.secondary" sx={{ fontWeight: 700 }}>No files match your criteria</Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>Try a different search term or upload a new file</Typography>
                </Paper>
            ) : (
                <Grid container spacing={2} onContextMenu={(e) => handleContextMenu(e, { type: 'empty' })}>
                    <AnimatePresence mode="popLayout">
                        {/* Folder Cards */}
                        {folders.map((folder) => {
                            const iconScaling = getIconScaling();
                            const typoScaling = getTypographyScaling();

                            return (
                                <Grid size={getGridSize()} key={`folder-${folder._id}`}>
                                    <motion.div
                                        layout
                                        initial={{ opacity: 0, scale: 0.9 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.9 }}
                                        transition={{ duration: 0.2 }}
                                        style={{ height: '100%' }}
                                    >
                                        <Paper
                                            variant="glass"
                                            elevation={0}
                                            onDoubleClick={() => navigateToFolder(folder)}
                                            onContextMenu={(e) => handleContextMenu(e, { type: 'folder', id: folder._id })}
                                            sx={{
                                                p: 2,
                                                position: 'relative',
                                                cursor: 'pointer',
                                                borderRadius: '24px', // More rounded as requested
                                                border: '1px solid transparent',
                                                bgcolor: 'transparent', // Darker feel
                                                display: 'flex',
                                                flexDirection: 'column',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                aspectRatio: '1/1',
                                                transition: 'all 0.2s ease-in-out',
                                                '&:hover': {
                                                    bgcolor: alpha(theme.palette.background.paper, 0.1),
                                                    borderColor: alpha(theme.palette.divider, 0.1),
                                                    transform: 'scale(1.02)',
                                                    boxShadow: `0 8px 32px 0 ${alpha(theme.palette.common.black, 0.2)}`
                                                }
                                            }}
                                        >
                                            <Box sx={{ mb: typoScaling.mb, filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.2))' }}>
                                                <FolderIcon sx={{ fontSize: iconScaling.size, color: '#FFB300' }} />
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
                                            <Typography variant="caption" sx={{ color: 'text.secondary', opacity: 0.7 }}>
                                                Folder
                                            </Typography>
                                        </Paper>
                                    </motion.div>
                                </Grid>
                            );
                        })}

                        {/* File Cards */}
                        {filteredFiles.map((file) => {
                            const iconScaling = getIconScaling();
                            const typoScaling = getTypographyScaling();

                            return (
                                <Grid size={getGridSize()} key={file._id}>
                                    <motion.div
                                        layout
                                        initial={{ opacity: 0, scale: 0.9 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.9 }}
                                        transition={{ duration: 0.2 }}
                                        style={{ height: '100%' }}
                                    >
                                        <Paper
                                            variant="glass"
                                            elevation={0}
                                            onClick={() => toggleSelect(file._id)}
                                            onContextMenu={(e) => handleContextMenu(e, { type: 'file', id: file._id })}
                                            sx={{
                                                p: 2,
                                                position: 'relative',
                                                cursor: 'pointer',
                                                borderRadius: '24px',
                                                border: selectedIds.has(file._id)
                                                    ? `2px solid ${theme.palette.primary.main}`
                                                    : '1px solid transparent',
                                                bgcolor: selectedIds.has(file._id)
                                                    ? alpha(theme.palette.primary.main, 0.1)
                                                    : 'transparent',
                                                display: 'flex',
                                                flexDirection: 'column',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                aspectRatio: '1/1',
                                                transition: 'all 0.2s ease-in-out',
                                                '&:hover': {
                                                    bgcolor: selectedIds.has(file._id)
                                                        ? alpha(theme.palette.primary.main, 0.15)
                                                        : alpha(theme.palette.background.paper, 0.1),
                                                    borderColor: selectedIds.has(file._id) ? theme.palette.primary.main : alpha(theme.palette.divider, 0.1),
                                                    transform: 'scale(1.02)',
                                                    boxShadow: `0 8px 32px 0 ${alpha(theme.palette.common.black, 0.2)}`
                                                }
                                            }}
                                        >
                                            <Box sx={{ position: 'absolute', top: 12, left: 12, opacity: selectedIds.has(file._id) ? 1 : 0, transition: 'opacity 0.2s' }}>
                                                <Checkbox
                                                    checked={selectedIds.has(file._id)}
                                                    size="small"
                                                    sx={{ p: 0, color: theme.palette.primary.main }}
                                                />
                                            </Box>

                                            <Box sx={{ mb: typoScaling.mb, filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.2))' }}>
                                                {(() => {
                                                    const { icon: FileTypeIcon, color } = getFileIconInfo(file.originalFileName);
                                                    return <FileTypeIcon sx={{ fontSize: iconScaling.size, color: color }} />;
                                                })()}
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
                                                    onClick={() => handleDownload(file)}
                                                    disabled={downloadingId === file._id}
                                                    sx={{
                                                        color: '#29B6F6', // Blue for download
                                                        p: 0.5,
                                                        '&:hover': { bgcolor: alpha('#29B6F6', 0.1) }
                                                    }}
                                                >
                                                    {downloadingId === file._id ? <CircularProgress size={20} /> : <DownloadIcon fontSize="small" />}
                                                </IconButton>
                                                <IconButton
                                                    size="small"
                                                    onClick={() => handleDelete(file._id)}
                                                    disabled={deletingIds.has(file._id)}
                                                    sx={{
                                                        color: '#EF5350', // Red for delete
                                                        p: 0.5,
                                                        '&:hover': { bgcolor: alpha('#EF5350', 0.1) }
                                                    }}
                                                >
                                                    {deletingIds.has(file._id) ? <CircularProgress size={20} /> : <TrashIcon fontSize="small" />}
                                                </IconButton>
                                            </Stack>
                                        </Paper>
                                    </motion.div>
                                </Grid>
                            );
                        })}
                    </AnimatePresence>
                </Grid>
            )}

            {/* Context Menu */}
            <ContextMenu
                open={contextMenu.open}
                anchorPosition={contextMenu.position}
                onClose={closeContextMenu}
                items={getContextMenuItems()}
            />

            {/* New Folder Dialog */}
            <Dialog open={newFolderDialog} onClose={() => setNewFolderDialog(false)} maxWidth="xs" fullWidth>
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
            <Dialog open={renameFolderDialog.open} onClose={() => setRenameFolderDialog({ open: false, folder: null })} maxWidth="xs" fullWidth>
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
            <Dialog open={moveToFolderDialog} onClose={() => setMoveToFolderDialog(false)} maxWidth="xs" fullWidth>
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
                        {folders.map(folder => (
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
        </Stack>
    );
}

