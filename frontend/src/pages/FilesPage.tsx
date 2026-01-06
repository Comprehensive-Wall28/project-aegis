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
    Search as SearchIcon
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
    Tooltip,
    TextField,
    InputAdornment
} from '@mui/material';
import vaultService, { type FileMetadata } from '@/services/vaultService';
import { motion, AnimatePresence } from 'framer-motion';
import UploadZone from '@/components/vault/UploadZone';
import { useVaultDownload } from '@/hooks/useVaultDownload';

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
    const truncatedBase = baseName.slice(0, maxLength - ext.length - 4) + '...';
    return `${truncatedBase}.${ext}`;
}

export function FilesPage() {
    const [files, setFiles] = useState<FileMetadata[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [downloadingId, setDownloadingId] = useState<string | null>(null);
    const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [showUpload, setShowUpload] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const { downloadAndDecrypt } = useVaultDownload();
    const theme = useTheme();

    useEffect(() => {
        fetchFiles();
    }, []);

    const fetchFiles = async () => {
        try {
            setIsLoading(true);
            const data = await vaultService.getRecentFiles();
            setFiles(data);
            setError(null);
        } catch (err) {
            console.error('Failed to fetch files:', err);
            setError('Failed to load files');
        } finally {
            setIsLoading(false);
        }
    };

    const handleDownload = async (file: FileMetadata) => {
        try {
            setDownloadingId(file._id);

            const decryptedBlob = await downloadAndDecrypt(file);

            if (!decryptedBlob) {
                console.error('Decryption failed');
                return;
            }

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
        if (!confirm(`Are you sure you want to delete ${selectedIds.size} file(s)? This cannot be undone.`)) return;

        const idsToDelete = Array.from(selectedIds);

        for (const id of idsToDelete) {
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
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }
            return next;
        });
    };

    const selectAll = () => {
        if (selectedIds.size === files.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(files.map(f => f._id)));
        }
    };

    const filteredFiles = files.filter(f =>
        f.originalFileName.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <Stack spacing={4}>
            {/* Header */}
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                    <Typography variant="h4" sx={{ display: 'flex', alignItems: 'center', gap: 2, fontWeight: 800 }}>
                        <FolderOpenIcon color="primary" sx={{ fontSize: 32 }} />
                        Encrypted Files
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5, fontWeight: 500 }}>
                        {files.length} file{files.length !== 1 ? 's' : ''} in your vault
                    </Typography>
                </Box>
                <Stack direction="row" spacing={2}>
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
                                sx={{ fontWeight: 700, borderRadius: 2 }}
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
                        sx={{ fontWeight: 700, borderRadius: 2 }}
                    >
                        {showUpload ? 'Close' : 'Upload'}
                    </Button>
                </Stack>
            </Box>

            {/* Search and Selection */}
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2 }}>
                <TextField
                    placeholder="Search files..."
                    size="small"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    sx={{
                        width: { xs: '100%', sm: 300 },
                        '& .MuiOutlinedInput-root': {
                            borderRadius: 3,
                            bgcolor: alpha(theme.palette.background.paper, 0.5),
                            backdropFilter: 'blur(8px)'
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
                <Paper variant="glass" sx={{ p: 4, borderRadius: 4 }}>
                    <UploadZone onUploadComplete={() => {
                        fetchFiles();
                        setShowUpload(false);
                    }} />
                </Paper>
            </Collapse>

            {/* Files Grid */}
            {isLoading ? (
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', py: 10 }}>
                    <CircularProgress />
                </Box>
            ) : error && files.length === 0 ? (
                <Paper variant="glass" sx={{ p: 10, textAlign: 'center', borderRadius: 4 }}>
                    <Typography color="text.secondary">{error}</Typography>
                    <Button variant="text" size="small" onClick={fetchFiles} sx={{ mt: 2 }}>
                        Retry
                    </Button>
                </Paper>
            ) : files.length === 0 ? (
                <Paper variant="glass" sx={{ p: 10, textAlign: 'center', borderRadius: 4 }}>
                    <FolderOpenIcon sx={{ fontSize: 64, color: 'text.secondary', opacity: 0.3, mb: 2 }} />
                    <Typography variant="h6" color="text.secondary" sx={{ fontWeight: 700 }}>No files in vault yet</Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>Upload your first encrypted file to get started</Typography>
                    <Button
                        variant="contained"
                        startIcon={<UploadIcon />}
                        onClick={() => setShowUpload(true)}
                        sx={{ borderRadius: 2, fontWeight: 700 }}
                    >
                        Upload File
                    </Button>
                </Paper>
            ) : (
                <Grid container spacing={3}>
                    <AnimatePresence mode="popLayout">
                        {filteredFiles.map((file, index) => (
                            <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3 }} key={file._id}>
                                <motion.div
                                    layout
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.9 }}
                                    transition={{ duration: 0.2, delay: index * 0.02 }}
                                >
                                    <Paper
                                        variant="glass"
                                        onClick={() => toggleSelect(file._id)}
                                        sx={{
                                            p: 3,
                                            position: 'relative',
                                            cursor: 'pointer',
                                            transition: 'all 0.2s ease-in-out',
                                            borderRadius: 4,
                                            border: selectedIds.has(file._id) ? `2.5px solid ${theme.palette.primary.main}` : `1px solid ${alpha(theme.palette.divider, 0.5)}`,
                                            bgcolor: selectedIds.has(file._id) ? alpha(theme.palette.primary.main, 0.05) : 'transparent',
                                            '&:hover': {
                                                transform: 'translateY(-4px)',
                                                borderColor: selectedIds.has(file._id) ? theme.palette.primary.main : alpha(theme.palette.primary.main, 0.3),
                                                bgcolor: alpha(theme.palette.common.white, 0.02)
                                            }
                                        }}
                                    >
                                        {/* Selection Checkbox */}
                                        <Box sx={{ position: 'absolute', top: 12, left: 12 }}>
                                            <Checkbox
                                                checked={selectedIds.has(file._id)}
                                                onClick={(e) => { e.stopPropagation(); toggleSelect(file._id); }}
                                                size="small"
                                                sx={{ color: alpha(theme.palette.common.white, 0.2) }}
                                            />
                                        </Box>

                                        {/* File Icon & Badge */}
                                        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mt: 2, mb: 3 }}>
                                            <Box sx={{ position: 'relative', mb: 2 }}>
                                                <Box sx={{ p: 2, borderRadius: 3, bgcolor: alpha(theme.palette.primary.main, 0.1) }}>
                                                    <FileIcon sx={{ fontSize: 40, color: theme.palette.primary.main }} />
                                                </Box>
                                                <Box sx={{ position: 'absolute', bottom: -6, right: -6, p: 0.5, borderRadius: '50%', bgcolor: theme.palette.background.paper, display: 'flex' }}>
                                                    <ShieldCheckIcon sx={{ fontSize: 16, color: 'info.main' }} />
                                                </Box>
                                            </Box>
                                            <Box sx={{ px: 1, py: 0.2, borderRadius: 1, bgcolor: alpha(theme.palette.info.main, 0.1), border: `1px solid ${alpha(theme.palette.info.main, 0.2)}` }}>
                                                <Typography variant="caption" sx={{ color: 'info.main', fontSize: '10px', fontWeight: 800, fontFamily: 'JetBrains Mono' }}>
                                                    ML-KEM
                                                </Typography>
                                            </Box>
                                        </Box>

                                        {/* File Info */}
                                        <Box sx={{ textAlign: 'center', mb: 3 }}>
                                            <Typography variant="body2" noWrap sx={{ fontWeight: 700, display: 'block' }} title={file.originalFileName}>
                                                {truncateFileName(file.originalFileName, 20)}
                                            </Typography>
                                            <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 500, mt: 0.5, display: 'block' }}>
                                                {formatFileSize(file.fileSize)} • {file.mimeType.split('/')[1]?.toUpperCase() || 'FILE'}
                                            </Typography>
                                        </Box>

                                        {/* Actions */}
                                        <Stack direction="row" spacing={1} justifyContent="center" onClick={e => e.stopPropagation()}>
                                            <Tooltip title="Decrypt & Download">
                                                <Button
                                                    size="small"
                                                    variant="text"
                                                    onClick={() => handleDownload(file)}
                                                    disabled={downloadingId === file._id}
                                                    startIcon={downloadingId === file._id ? <CircularProgress size={14} color="inherit" /> : <DownloadIcon sx={{ fontSize: 18 }} />}
                                                    sx={{ fontSize: '12px', fontWeight: 700 }}
                                                >
                                                    {downloadingId === file._id ? '' : 'Decrypt'}
                                                </Button>
                                            </Tooltip>
                                            <Tooltip title="Delete">
                                                <IconButton
                                                    size="small"
                                                    color="error"
                                                    onClick={() => handleDelete(file._id)}
                                                    disabled={deletingIds.has(file._id)}
                                                    sx={{ border: `1px solid ${alpha(theme.palette.error.main, 0.1)}`, '&:hover': { bgcolor: alpha(theme.palette.error.main, 0.1) } }}
                                                >
                                                    {deletingIds.has(file._id) ? <CircularProgress size={16} color="inherit" /> : <TrashIcon sx={{ fontSize: 18 }} />}
                                                </IconButton>
                                            </Tooltip>
                                        </Stack>
                                    </Paper>
                                </motion.div>
                            </Grid>
                        ))}
                    </AnimatePresence>
                </Grid>
            )}
        </Stack>
    );
}
