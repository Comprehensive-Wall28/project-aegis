import { useState, useEffect } from 'react';
import {
    InsertDriveFile as FileIcon,
    FileDownload as DownloadIcon,
    FolderOpen as FolderOpenIcon,
    GppGood as ShieldCheckIcon,
    Delete as TrashIcon,
    OpenInNew as ExternalLinkIcon
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
    Tooltip,
    Stack
} from '@mui/material';
import vaultService, { type FileMetadata } from '@/services/vaultService';
import { motion, AnimatePresence } from 'framer-motion';
import UploadZone from '@/components/vault/UploadZone';
import { useVaultDownload } from '@/hooks/useVaultDownload';
import { Link } from 'react-router-dom';

function formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function truncateFileName(name: string, maxLength: number = 24): string {
    if (name.length <= maxLength) return name;
    const ext = name.split('.').pop() || '';
    const baseName = name.slice(0, name.length - ext.length - 1);
    const truncatedBase = baseName.slice(0, maxLength - ext.length - 4) + '...';
    return `${truncatedBase}.${ext}`;
}

export function VaultQuickView() {
    const [files, setFiles] = useState<FileMetadata[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [downloadingId, setDownloadingId] = useState<string | null>(null);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const { downloadAndDecrypt } = useVaultDownload();
    const theme = useTheme();

    useEffect(() => {
        fetchFiles();
    }, []);

    const fetchFiles = async () => {
        try {
            setIsLoading(true);
            const data = await vaultService.getRecentFiles();
            setFiles(data.slice(0, 1)); // Show only the last uploaded file
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

            // Download and decrypt the file
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
        if (!confirm('Are you sure you want to delete this file? This action cannot be undone.')) {
            return;
        }
        try {
            setDeletingId(fileId);
            await vaultService.deleteFile(fileId);
            setFiles(files.filter(f => f._id !== fileId));
        } catch (err) {
            console.error('Delete failed:', err);
        } finally {
            setDeletingId(null);
        }
    };

    return (
        <Paper
            variant="glass"
            sx={{
                height: '100%',
                p: 3,
                display: 'flex',
                flexDirection: 'column',
                position: 'relative',
                overflow: 'hidden',
                borderRadius: 4
            }}
        >
            {/* Header */}
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
                <Box>
                    <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1.5, fontWeight: 700 }}>
                        <FolderOpenIcon color="primary" sx={{ fontSize: 24 }} />
                        Last Upload
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 500 }}>
                        Your most recent encrypted file
                    </Typography>
                </Box>
                <Button
                    component={Link}
                    to="/dashboard/files"
                    size="small"
                    endIcon={<ExternalLinkIcon sx={{ fontSize: 14 }} />}
                    sx={{
                        fontSize: '11px',
                        fontFamily: 'JetBrains Mono',
                        color: alpha(theme.palette.primary.main, 0.7),
                        '&:hover': { color: theme.palette.primary.main, bgcolor: alpha(theme.palette.primary.main, 0.05) }
                    }}
                >
                    View All
                </Button>
            </Box>

            {/* Content */}
            <Stack spacing={3} sx={{ flex: 1, overflow: 'hidden' }}>
                <UploadZone onUploadComplete={fetchFiles} />

                <Box sx={{ flex: 1, overflowY: 'auto' }}>
                    {isLoading ? (
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', py: 6 }}>
                            <CircularProgress size={32} />
                        </Box>
                    ) : error && files.length === 0 ? (
                        <Box sx={{ textAlign: 'center', py: 6 }}>
                            <Typography color="text.secondary" variant="body2">{error}</Typography>
                            <Button size="small" variant="text" onClick={fetchFiles} sx={{ mt: 1 }}>
                                Retry
                            </Button>
                        </Box>
                    ) : files.length === 0 ? (
                        <Box sx={{ textAlign: 'center', py: 6, opacity: 0.5 }}>
                            <FolderOpenIcon sx={{ fontSize: 48, mb: 2, color: 'text.secondary' }} />
                            <Typography variant="body2" color="text.secondary">No files in vault yet</Typography>
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                                Upload your first encrypted file
                            </Typography>
                        </Box>
                    ) : (
                        <Stack spacing={2}>
                            <AnimatePresence>
                                {files.map((file) => (
                                    <Box
                                        key={file._id}
                                        component={motion.div}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, scale: 0.95 }}
                                        sx={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                            p: 2,
                                            borderRadius: 3,
                                            bgcolor: alpha(theme.palette.common.white, 0.03),
                                            transition: 'all 0.2s ease',
                                            border: `1px solid ${alpha(theme.palette.divider, 0.5)}`,
                                            '&:hover': {
                                                bgcolor: alpha(theme.palette.common.white, 0.06),
                                                borderColor: alpha(theme.palette.primary.main, 0.2),
                                                transform: 'translateY(-2px)'
                                            }
                                        }}
                                    >
                                        {/* Left: Icon + Name + Size */}
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, minWidth: 0, flex: 1 }}>
                                            <Box sx={{ position: 'relative' }}>
                                                <Box
                                                    sx={{
                                                        p: 1.2,
                                                        borderRadius: 2,
                                                        bgcolor: alpha(theme.palette.primary.main, 0.1),
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center'
                                                    }}
                                                >
                                                    <FileIcon sx={{ fontSize: 20, color: theme.palette.primary.main }} />
                                                </Box>
                                                <Box
                                                    sx={{
                                                        position: 'absolute',
                                                        bottom: -4,
                                                        right: -4,
                                                        p: 0.2,
                                                        borderRadius: '50%',
                                                        bgcolor: theme.palette.background.paper,
                                                        display: 'flex'
                                                    }}
                                                >
                                                    <ShieldCheckIcon
                                                        sx={{
                                                            fontSize: 14,
                                                            color: 'info.main',
                                                            animation: 'pulse 2s infinite ease-in-out'
                                                        }}
                                                    />
                                                </Box>
                                            </Box>

                                            <Box sx={{ minWidth: 0, flex: 1 }}>
                                                <Typography
                                                    variant="body2"
                                                    noWrap
                                                    sx={{ fontWeight: 600, color: 'text.primary' }}
                                                    title={file.originalFileName}
                                                >
                                                    {truncateFileName(file.originalFileName)}
                                                </Typography>
                                                <Typography variant="caption" sx={{ fontFamily: 'JetBrains Mono', color: 'text.secondary' }}>
                                                    {formatFileSize(file.fileSize)} • {file.mimeType.split('/')[1]?.toUpperCase() || 'FILE'}
                                                </Typography>
                                            </Box>
                                        </Box>

                                        {/* Right: Actions */}
                                        <Stack direction="row" spacing={1} alignItems="center" sx={{ ml: 2 }}>
                                            <Box
                                                sx={{
                                                    px: 1,
                                                    py: 0.2,
                                                    borderRadius: 1,
                                                    bgcolor: alpha(theme.palette.info.main, 0.1),
                                                    border: `1px solid ${alpha(theme.palette.info.main, 0.2)}`
                                                }}
                                            >
                                                <Typography variant="caption" sx={{ color: 'info.main', fontSize: '10px', fontWeight: 700, fontFamily: 'JetBrains Mono' }}>
                                                    ML-KEM
                                                </Typography>
                                            </Box>

                                            <Tooltip title="Decrypt & Download">
                                                <IconButton
                                                    size="small"
                                                    onClick={() => handleDownload(file)}
                                                    disabled={downloadingId === file._id}
                                                    sx={{
                                                        color: theme.palette.primary.main,
                                                        '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.1) }
                                                    }}
                                                >
                                                    {downloadingId === file._id ? (
                                                        <CircularProgress size={16} color="inherit" />
                                                    ) : (
                                                        <DownloadIcon sx={{ fontSize: 18 }} />
                                                    )}
                                                </IconButton>
                                            </Tooltip>

                                            <Tooltip title="Delete">
                                                <IconButton
                                                    size="small"
                                                    onClick={() => handleDelete(file._id)}
                                                    disabled={deletingId === file._id}
                                                    sx={{
                                                        color: 'error.main',
                                                        '&:hover': { bgcolor: alpha(theme.palette.error.main, 0.1) }
                                                    }}
                                                >
                                                    {deletingId === file._id ? (
                                                        <CircularProgress size={16} color="inherit" />
                                                    ) : (
                                                        <TrashIcon sx={{ fontSize: 18 }} />
                                                    )}
                                                </IconButton>
                                            </Tooltip>
                                        </Stack>
                                    </Box>
                                ))}
                            </AnimatePresence>
                        </Stack>
                    )}
                </Box>
            </Stack>

            <style>{`
                @keyframes pulse {
                    0% { transform: scale(1); opacity: 0.6; }
                    50% { transform: scale(1.1); opacity: 1; }
                    100% { transform: scale(1); opacity: 0.6; }
                }
            `}</style>
        </Paper>
    );
}
