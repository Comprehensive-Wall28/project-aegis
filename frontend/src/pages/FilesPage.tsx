import { useState, useEffect } from 'react';
import {
    InsertDriveFile as FileIcon,
    FileDownload as DownloadIcon,
    FolderOpen as FolderOpenIcon,
    GppGood as ShieldCheckIcon,
    Delete as TrashIcon,
    FileUpload as UploadIcon,
    CheckBox as CheckSquareIcon,
    CheckBoxOutlineBlank as SquareIcon,
    IndeterminateCheckBox as XSquareIcon,
    Search as SearchIcon,
    GridView as GridViewIcon
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
    FormControl
} from '@mui/material';
import vaultService, { type FileMetadata } from '@/services/vaultService';
import { motion, AnimatePresence } from 'framer-motion';
import UploadZone from '@/components/vault/UploadZone';
import { useVaultDownload } from '@/hooks/useVaultDownload';
import { BackendDown } from '@/components/BackendDown';

function formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function truncateFileName(name: string, maxLength: number = 32): string {
    if (!name) return 'Unknown File';
    if (name.length <= maxLength) return name;
    const ext = name.split('.').pop() || '';
    const baseName = name.slice(0, name.length - ext.length - 1);
    const truncatedBase = baseName.slice(0, Math.max(0, maxLength - ext.length - 4)) + '...';
    return `${truncatedBase}.${ext}`;
}

type ViewPreset = 'compact' | 'standard' | 'comfort' | 'detailed';

export function FilesPage() {
    const [files, setFiles] = useState<FileMetadata[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [, setError] = useState<string | null>(null);
    const [downloadingId, setDownloadingId] = useState<string | null>(null);
    const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [showUpload, setShowUpload] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [viewPreset, setViewPreset] = useState<ViewPreset>('standard');
    const [backendError, setBackendError] = useState(false);
    const { downloadAndDecrypt } = useVaultDownload();
    const theme = useTheme();

    useEffect(() => {
        fetchFiles();
    }, []);

    const fetchFiles = async () => {
        try {
            setIsLoading(true);
            setBackendError(false);
            const data = await vaultService.getRecentFiles();
            setFiles(data);
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
            case 'comfort': return { xs: 12, sm: 12, md: 6, lg: 4 };
            case 'detailed': return { xs: 12, sm: 12, md: 12, lg: 6 };
            default: return { xs: 12, sm: 6, md: 4, lg: 3 }; // Standard
        }
    };

    const getIconScaling = () => {
        switch (viewPreset) {
            case 'compact': return { size: 28, padding: 1, badge: 12 };
            case 'comfort': return { size: 64, padding: 2.5, badge: 18 };
            case 'detailed': return { size: 96, padding: 3.5, badge: 24 };
            default: return { size: 44, padding: 2, badge: 14 }; // Standard
        }
    };

    const getTypographyScaling = () => {
        switch (viewPreset) {
            case 'compact': return { name: 'caption', size: 10, mb: 0.25 };
            case 'comfort': return { name: 'subtitle1', size: 24, mb: 1 };
            case 'detailed': return { name: 'h6', size: 36, mb: 1.5 };
            default: return { name: 'body2', size: 18, mb: 0.5 }; // Standard
        }
    };

    // Show backend error page
    if (backendError) {
        return <BackendDown onRetry={fetchFiles} />;
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
                        fetchFiles();
                        setShowUpload(false);
                    }} />
                </Paper>
            </Collapse>

            {/* Files Grid */}
            {isLoading ? (
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', py: 10 }}>
                    <CircularProgress thickness={5} size={40} />
                </Box>
            ) : filteredFiles.length === 0 ? (
                <Paper variant="glass" sx={{ p: 10, textAlign: 'center', borderRadius: '16px' }}>
                    <FolderOpenIcon sx={{ fontSize: 64, color: 'text.secondary', opacity: 0.3, mb: 2 }} />
                    <Typography variant="h6" color="text.secondary" sx={{ fontWeight: 700 }}>No files match your criteria</Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>Try a different search term or upload a new file</Typography>
                </Paper>
            ) : (
                <Grid container spacing={viewPreset === 'compact' ? 2 : 3}>
                    <AnimatePresence mode="popLayout">
                        {filteredFiles.map((file) => {
                            const iconScaling = getIconScaling();
                            const typoScaling = getTypographyScaling();

                            return (
                                <Grid size={getGridSize()} key={file._id}>
                                    <motion.div
                                        layout
                                        initial={{ opacity: 0, scale: 0.95 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.95 }}
                                        transition={{ duration: 0.2 }}
                                        style={{ height: '100%', width: '100%' }}
                                    >
                                        <Paper
                                            variant="glass"
                                            onClick={() => toggleSelect(file._id)}
                                            sx={{
                                                p: viewPreset === 'compact' ? 1.5 : 3,
                                                position: 'relative',
                                                cursor: 'pointer',
                                                transition: 'all 0.3s ease',
                                                borderRadius: '16px',
                                                border: selectedIds.has(file._id) ? `2px solid ${theme.palette.primary.main}` : `1px solid ${alpha(theme.palette.divider, 0.3)}`,
                                                bgcolor: selectedIds.has(file._id) ? alpha(theme.palette.primary.main, 0.03) : 'transparent',
                                                display: 'flex',
                                                flexDirection: 'column',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                height: '100%',
                                                aspectRatio: '1 / 1',
                                                overflow: 'hidden',
                                                '&:hover': {
                                                    transform: 'translateY(-4px)',
                                                    borderColor: selectedIds.has(file._id) ? theme.palette.primary.main : alpha(theme.palette.primary.main, 0.3),
                                                    bgcolor: alpha(theme.palette.common.white, 0.02),
                                                    boxShadow: `0 12px 24px ${alpha(theme.palette.common.black, 0.4)}`
                                                }
                                            }}
                                        >
                                            <Box sx={{ position: 'absolute', top: 8, left: 8 }}>
                                                <Checkbox
                                                    checked={selectedIds.has(file._id)}
                                                    onClick={(e) => { e.stopPropagation(); toggleSelect(file._id); }}
                                                    size="small"
                                                    sx={{ color: alpha(theme.palette.common.white, 0.05), '&.Mui-checked': { color: theme.palette.primary.main } }}
                                                />
                                            </Box>

                                            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 1, width: '100%' }}>
                                                <Box sx={{ position: 'relative', mb: typoScaling.mb }}>
                                                    <Box sx={{ p: iconScaling.padding, borderRadius: '12px', bgcolor: alpha(theme.palette.primary.main, 0.05), display: 'flex' }}>
                                                        <FileIcon sx={{ fontSize: iconScaling.size, color: theme.palette.primary.main }} />
                                                    </Box>
                                                    <Box sx={{ position: 'absolute', bottom: -2, right: -2, p: 0.2, borderRadius: '50%', bgcolor: theme.palette.background.paper, border: `1px solid ${alpha(theme.palette.divider, 0.5)}`, display: 'flex' }}>
                                                        <ShieldCheckIcon sx={{ fontSize: iconScaling.badge, color: 'info.main' }} />
                                                    </Box>
                                                </Box>
                                            </Box>

                                            <Box sx={{ textAlign: 'center', width: '100%', px: 1 }}>
                                                <Typography
                                                    variant={typoScaling.name as any}
                                                    noWrap
                                                    sx={{ fontWeight: 700, display: 'block', mb: 0.5, px: 0.5 }}
                                                    title={file.originalFileName}
                                                >
                                                    {truncateFileName(file.originalFileName, typoScaling.size)}
                                                </Typography>
                                                <Typography variant="caption" noWrap sx={{ color: 'text.secondary', display: 'block', fontSize: viewPreset === 'compact' ? '8px' : '10px', opacity: 0.8 }}>
                                                    {formatFileSize(file.fileSize)}
                                                </Typography>
                                            </Box>

                                            <Stack
                                                direction="row"
                                                spacing={viewPreset === 'compact' ? 0.25 : 1}
                                                justifyContent="center"
                                                onClick={e => e.stopPropagation()}
                                                sx={{ mt: viewPreset === 'compact' ? 1 : 2 }}
                                            >
                                                <IconButton
                                                    size="small"
                                                    onClick={() => handleDownload(file)}
                                                    disabled={downloadingId === file._id}
                                                    sx={{ color: 'primary.main', p: viewPreset === 'compact' ? 0.4 : 0.8 }}
                                                >
                                                    {downloadingId === file._id ? <CircularProgress size={iconScaling.badge} /> : <DownloadIcon sx={{ fontSize: iconScaling.badge + 4 }} />}
                                                </IconButton>
                                                <IconButton
                                                    size="small"
                                                    color="error"
                                                    onClick={() => handleDelete(file._id)}
                                                    disabled={deletingIds.has(file._id)}
                                                    sx={{ p: viewPreset === 'compact' ? 0.4 : 0.8 }}
                                                >
                                                    {deletingIds.has(file._id) ? <CircularProgress size={iconScaling.badge} /> : <TrashIcon sx={{ fontSize: iconScaling.badge + 4 }} />}
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
        </Stack>
    );
}
