import { useState, useEffect } from 'react';
import {
    InsertDriveFile as FileIcon,
    FileDownload as DownloadIcon,
    FolderOpen as FolderOpenIcon,
    GppGood as ShieldCheckIcon,
    Delete as TrashIcon,
    OpenInNew as ExternalLinkIcon,
    CloudUpload as CloudUploadIcon
} from '@mui/icons-material';
import {
    Box,
    Typography,
    Button,
    IconButton,
    CircularProgress,
    Paper,
    alpha,
    useTheme
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

function truncateFileName(name: string, maxLength: number = 32): string {
    if (name.length <= maxLength) return name;
    const ext = name.split('.').pop() || '';
    const baseName = name.slice(0, name.length - ext.length - 1);
    const truncatedBase = baseName.slice(0, Math.max(0, maxLength - ext.length - 4)) + '...';
    return `${truncatedBase}.${ext}`;
}

export function VaultQuickView() {
    const [files, setFiles] = useState<FileMetadata[]>([]);
    const [isLoading, setIsLoading] = useState(true);
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
        } catch (err) {
            console.error('Failed to fetch files:', err);
        } finally {
            setIsLoading(false);
        }
    };

    const handleDownload = async (file: FileMetadata) => {
        try {
            setDownloadingId(file._id);
            const decryptedBlob = await downloadAndDecrypt(file);
            if (!decryptedBlob) return; // Error handled in hook

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
        if (!confirm('Are you sure you want to delete this file? This action cannot be undone.')) return;
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
            sx={{
                p: 3,
                height: '100%',
                borderRadius: '16px', // Standardized to 16px
                bgcolor: alpha(theme.palette.background.paper, 0.4),
                backdropFilter: 'blur(12px)',
                border: `1px solid ${alpha(theme.palette.common.white, 0.05)}`,
                display: 'flex',
                flexDirection: 'column',
                position: 'relative',
                overflow: 'hidden',
                boxShadow: '0 4px 24px -1px rgba(0, 0, 0, 0.2)',
                transition: 'all 0.3s ease',
            }}
        >
            {/* Header */}
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
                <Box>
                    <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1.5, fontWeight: 700 }}>
                        <FolderOpenIcon color="primary" sx={{ fontSize: 24 }} />
                        Secure Vault
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 500 }}>
                        Drag & drop to encrypt with ML-KEM-1024
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
                        height: 32,
                        borderRadius: '8px',
                        bgcolor: alpha(theme.palette.primary.main, 0.1),
                        color: theme.palette.primary.main,
                        '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.15) }
                    }}
                >
                    All Files
                </Button>
            </Box>

            {/* Content: Flex 1 to fill available space */}
            <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 3 }}>
                {/* Upload Zone */}
                <Box sx={{ flex: 1, minHeight: 180 }}>
                    <UploadZone onUploadComplete={fetchFiles} />
                </Box>

                {/* Recent File Section */}
                <Box sx={{ minHeight: 80 }}>
                    {isLoading ? (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, p: 2 }}>
                            <CircularProgress size={20} thickness={4} />
                            <Typography variant="body2" color="text.secondary">Syncing vault...</Typography>
                        </Box>
                    ) : (
                        <AnimatePresence mode="wait">
                            {files.length > 0 ? (
                                <motion.div
                                    key="file-card"
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                >
                                    <Paper
                                        elevation={0}
                                        sx={{
                                            p: 2,
                                            borderRadius: '16px',
                                            bgcolor: alpha(theme.palette.common.white, 0.03),
                                            border: `1px solid ${alpha(theme.palette.common.white, 0.08)}`,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                            transition: 'all 0.2s ease',
                                            '&:hover': {
                                                bgcolor: alpha(theme.palette.common.white, 0.05),
                                                borderColor: alpha(theme.palette.primary.main, 0.2)
                                            }
                                        }}
                                    >
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                            <Box
                                                sx={{
                                                    width: 48,
                                                    height: 48,
                                                    borderRadius: '12px',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    bgcolor: alpha(theme.palette.primary.main, 0.1),
                                                    color: theme.palette.primary.main
                                                }}
                                            >
                                                <FileIcon />
                                            </Box>
                                            <Box>
                                                <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary', mb: 0.5 }}>
                                                    {truncateFileName(files[0].originalFileName)}
                                                </Typography>
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                    <Typography variant="caption" sx={{ fontFamily: 'JetBrains Mono', color: 'text.secondary' }}>
                                                        {formatFileSize(files[0].fileSize)}
                                                    </Typography>
                                                    <Box sx={{ width: 3, height: 3, borderRadius: '50%', bgcolor: 'text.secondary' }} />
                                                    <Typography variant="caption" sx={{ color: '#10b981', fontWeight: 700, fontSize: '10px', letterSpacing: 0.5, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                                        <ShieldCheckIcon sx={{ fontSize: 12 }} /> ENCRYPTED
                                                    </Typography>
                                                </Box>
                                            </Box>
                                        </Box>

                                        <Box sx={{ display: 'flex', gap: 1 }}>
                                            <IconButton
                                                size="small"
                                                onClick={() => handleDownload(files[0])}
                                                disabled={!!downloadingId}
                                                sx={{
                                                    color: 'text.secondary',
                                                    '&:hover': { color: theme.palette.primary.main, bgcolor: alpha(theme.palette.primary.main, 0.1) }
                                                }}
                                            >
                                                {downloadingId ? <CircularProgress size={18} /> : <DownloadIcon fontSize="small" />}
                                            </IconButton>
                                            <IconButton
                                                size="small"
                                                onClick={() => handleDelete(files[0]._id)}
                                                disabled={!!deletingId}
                                                sx={{
                                                    color: 'text.secondary',
                                                    '&:hover': { color: theme.palette.error.main, bgcolor: alpha(theme.palette.error.main, 0.1) }
                                                }}
                                            >
                                                {deletingId ? <CircularProgress size={18} /> : <TrashIcon fontSize="small" />}
                                            </IconButton>
                                        </Box>
                                    </Paper>
                                </motion.div>
                            ) : (
                                <motion.div
                                    key="empty-state"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                >
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, p: 2, opacity: 0.5 }}>
                                        <CloudUploadIcon />
                                        <Typography variant="body2">No recent uploads</Typography>
                                    </Box>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    )}
                </Box>
            </Box>
        </Paper>
    );
}
