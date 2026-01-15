import React, { useEffect, useState } from 'react';
import {
    Box,
    Typography,
    Paper,
    List,
    ListItem,
    ListItemText,
    IconButton,
    Button,
    CircularProgress,
    Alert,
    Tooltip,
    Stack,
    alpha,
    Chip,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    useTheme,
    Pagination,
    Skeleton
} from '@mui/material';
import {
    Delete as DeleteIcon,
    Link as LinkIcon,
    InsertDriveFile as FileIcon,
    Folder as FolderIcon,
    Visibility as ViewIcon,
    InfoOutlined as InfoIcon,
    Refresh as RefreshIcon
} from '@mui/icons-material';
import apiClient from '@/services/api';

interface SharedLinkData {
    _id: string;
    token: string;
    resourceId: string;
    resourceType: 'file' | 'folder';
    views: number;
    createdAt: string;
    resourceDetails?: {
        originalFileName?: string;
        name?: string;
        fileSize?: number;
        mimeType?: string;
    };
    encryptedKey: string;
}

interface PublicLinkSettingsProps {
    onNotification?: (type: 'success' | 'error', message: string) => void;
}

export const PublicLinkSettings: React.FC<PublicLinkSettingsProps> = ({ onNotification }) => {
    const theme = useTheme();
    const [links, setLinks] = useState<SharedLinkData[]>([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [error, setError] = useState<string | null>(null);
    const [revokingId, setRevokingId] = useState<string | null>(null);
    const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

    const fetchLinks = async () => {
        setLoading(true);
        try {
            const response = await apiClient.get('/share/my-links', {
                params: { page, limit: 5 }
            });
            setLinks(response.data.links);
            setTotalPages(response.data.pages);
        } catch (err: any) {
            console.error('Failed to fetch links:', err);
            setError(err.response?.data?.message || 'Failed to load public links');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLinks();
    }, [page]);



    const handleRevoke = async () => {
        if (!deleteConfirmId) return;
        setRevokingId(deleteConfirmId);
        try {
            await apiClient.delete(`/share/link/${deleteConfirmId}`);
            setLinks(prev => prev.filter(l => l._id !== deleteConfirmId));
            setDeleteConfirmId(null);
            if (onNotification) {
                onNotification('success', 'Public sharing link revoked successfully.');
            }
            // Auto-refresh to refill the page if there are more
            fetchLinks();
        } catch (err: any) {
            const message = err.response?.data?.message || 'Failed to revoke link';
            if (onNotification) {
                onNotification('error', message);
            } else {
                setError(message);
            }
        } finally {
            setRevokingId(null);
        }
    };

    const formatSize = (bytes: number) => {
        if (!bytes) return '0 B';
        const k = 1024;
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + ['B', 'KB', 'MB', 'GB'][i];
    };

    return (
        <Box sx={{ mt: 4 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="h6" fontWeight={700}>
                    Active Public Sharing Links
                </Typography>
                <Tooltip title="Refresh Links">
                    <Box component="span">
                        <IconButton
                            onClick={() => fetchLinks()}
                            disabled={loading}
                            size="small"
                            sx={{
                                color: theme.palette.primary.main,
                                bgcolor: alpha(theme.palette.primary.main, 0.1),
                                '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.2) }
                            }}
                        >
                            {loading ? <CircularProgress size={18} color="inherit" /> : <RefreshIcon fontSize="small" />}
                        </IconButton>
                    </Box>
                </Tooltip>
            </Box>

            {/* Zero Knowledge Note - Always visible to set context */}
            <Paper sx={{
                p: 2,
                mb: 3,
                bgcolor: alpha(theme.palette.primary.main, 0.05),
                border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
                borderRadius: '12px',
                display: 'flex',
                gap: 2,
                alignItems: 'flex-start'
            }}>
                <InfoIcon sx={{ color: theme.palette.primary.main, mt: 0.3 }} fontSize="small" />
                <Typography variant="body2" sx={{ color: 'text.secondary', lineHeight: 1.6 }}>
                    <strong style={{ color: theme.palette.text.primary }}>Zero-Knowledge Policy:</strong> For your security, Aegis does not store sharing keys on our servers.
                    Full links can only be obtained at the time of creation. From here, you can only <strong style={{ color: theme.palette.text.primary }}>Revoke</strong> existing links to prevent further access.
                </Typography>
            </Paper>

            {/* Error State */}
            {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}

            {/* Loading State (initial) */}
            {loading && links.length === 0 && (
                <Paper sx={{ borderRadius: '16px', overflow: 'hidden', border: `1px solid ${alpha(theme.palette.divider, 0.1)}`, bgcolor: alpha(theme.palette.background.paper, 0.4) }}>
                    <List disablePadding>
                        {[1, 2, 3, 4, 5].map((i) => (
                            <ListItem key={i} sx={{ borderBottom: i < 5 ? `1px solid ${alpha(theme.palette.divider, 0.1)}` : 'none', py: 2 }}>
                                <Box sx={{ mr: 2 }}>
                                    <Skeleton variant="circular" width={24} height={24} sx={{ bgcolor: alpha(theme.palette.common.white, 0.05) }} />
                                </Box>
                                <ListItemText
                                    primary={<Skeleton width="40%" sx={{ bgcolor: alpha(theme.palette.common.white, 0.05) }} />}
                                    secondary={<Skeleton width="20%" sx={{ bgcolor: alpha(theme.palette.common.white, 0.05) }} />}
                                />
                            </ListItem>
                        ))}
                    </List>
                </Paper>
            )}

            {/* Empty State */}
            {!loading && links.length === 0 && !error && (
                <Paper sx={{
                    p: 4,
                    textAlign: 'center',
                    bgcolor: alpha(theme.palette.common.white, 0.02),
                    border: `1px dashed ${alpha(theme.palette.divider, 0.2)}`,
                    borderRadius: '16px'
                }}>
                    <LinkIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 2 }} />
                    <Typography color="text.secondary">No active public links found.</Typography>
                </Paper>
            )}

            {/* Links List */}
            {links.length > 0 && (
                <Paper sx={{
                    borderRadius: '16px',
                    overflow: 'hidden',
                    border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                    bgcolor: alpha(theme.palette.background.paper, 0.4),
                    backdropFilter: 'blur(10px)',
                    position: 'relative',
                    opacity: loading ? 0.7 : 1,
                    transition: 'opacity 0.2s'
                }}>
                    {loading && (
                        <Box sx={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1, bgcolor: alpha(theme.palette.background.paper, 0.2) }}>
                            <CircularProgress size={24} />
                        </Box>
                    )}
                    <List disablePadding>
                        {links.map((link, index) => (
                            <ListItem
                                key={link._id}
                                disablePadding
                                sx={{
                                    borderBottom: index < links.length - 1 ? `1px solid ${alpha(theme.palette.divider, 0.1)}` : 'none',
                                    '&:hover': { bgcolor: alpha(theme.palette.common.white, 0.02) },
                                    display: 'flex',
                                    alignItems: 'center',
                                    p: { xs: 1.5, sm: 2 },
                                    position: 'relative',
                                    overflow: 'hidden'
                                }}
                            >
                                <Box sx={{
                                    mr: { xs: 1.5, sm: 2 },
                                    color: link.resourceType === 'file' ? 'primary.main' : 'warning.main',
                                    display: 'flex',
                                    flexShrink: 0
                                }}>
                                    {link.resourceType === 'file' ? <FileIcon /> : <FolderIcon />}
                                </Box>

                                <Box sx={{ flex: 1, minWidth: 0 }}>
                                    {/* Primary Info */}
                                    <Stack direction="row" spacing={1} alignItems="flex-start">
                                        <Typography
                                            variant="subtitle2"
                                            sx={{
                                                fontWeight: 800,
                                                color: 'text.primary',
                                                wordBreak: 'break-all',
                                                lineHeight: 1.4,
                                                flex: 1
                                            }}
                                        >
                                            {link.resourceDetails?.originalFileName || link.resourceDetails?.name || 'Unknown Resource'}
                                        </Typography>
                                        <Chip
                                            label={link.resourceType}
                                            size="small"
                                            variant="outlined"
                                            sx={{
                                                height: 18,
                                                fontSize: '0.6rem',
                                                textTransform: 'uppercase',
                                                fontWeight: 800,
                                                opacity: 0.8,
                                                flexShrink: 0,
                                                mt: 0.3
                                            }}
                                        />
                                    </Stack>

                                    {/* Secondary Info / Metadata */}
                                    <Stack
                                        direction={{ xs: 'column', sm: 'row' }}
                                        spacing={{ xs: 0.5, sm: 2 }}
                                        sx={{ mt: 0.5 }}
                                    >
                                        <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 500 }}>
                                            Created {new Date(link.createdAt).toLocaleDateString()}
                                        </Typography>
                                        <Stack direction="row" spacing={2} alignItems="center">
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                                <ViewIcon sx={{ fontSize: 13, color: 'text.disabled' }} />
                                                <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 500 }}>
                                                    {link.views} views
                                                </Typography>
                                            </Box>
                                            {link.resourceDetails?.fileSize && (
                                                <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 500 }}>
                                                    {formatSize(link.resourceDetails.fileSize)}
                                                </Typography>
                                            )}
                                        </Stack>
                                    </Stack>
                                </Box>

                                <Box sx={{ ml: 1, flexShrink: 0 }}>
                                    <Tooltip title="Revoke Link">
                                        <Box component="span">
                                            <IconButton
                                                onClick={() => setDeleteConfirmId(link._id)}
                                                size="small"
                                                sx={{
                                                    color: 'error.main',
                                                    '&:hover': { bgcolor: alpha(theme.palette.error.main, 0.1) }
                                                }}
                                                disabled={revokingId === link._id}
                                            >
                                                {revokingId === link._id ? (
                                                    <CircularProgress size={18} color="inherit" />
                                                ) : (
                                                    <DeleteIcon fontSize="small" />
                                                )}
                                            </IconButton>
                                        </Box>
                                    </Tooltip>
                                </Box>
                            </ListItem>
                        ))}
                    </List>
                </Paper>
            )}

            {links.length > 0 && totalPages > 1 && (
                <Box sx={{ mt: 3, display: 'flex', justifyContent: 'center' }}>
                    <Pagination
                        count={totalPages}
                        page={page}
                        onChange={(_, v) => setPage(v)}
                        color="primary"
                        size="medium"
                        sx={{
                            '& .MuiPaginationItem-root': {
                                color: 'text.secondary',
                                fontWeight: 600,
                                '&:hover': {
                                    bgcolor: alpha(theme.palette.primary.main, 0.1)
                                },
                                '&.Mui-selected': {
                                    bgcolor: alpha(theme.palette.primary.main, 0.2),
                                    color: theme.palette.primary.main,
                                    border: `1px solid ${alpha(theme.palette.primary.main, 0.3)}`,
                                    '&:hover': {
                                        bgcolor: alpha(theme.palette.primary.main, 0.3)
                                    }
                                }
                            }
                        }}
                    />
                </Box>
            )}

            {/* Delete Confirmation Dialog */}
            <Dialog open={!!deleteConfirmId} onClose={() => setDeleteConfirmId(null)}>
                <DialogTitle>Revoke Shared Link?</DialogTitle>
                <DialogContent>
                    <Typography variant="body2" color="text.secondary">
                        This will permanently deactivate the shared link. Anyone with the link will no longer be able to access the file. This action cannot be undone.
                    </Typography>
                </DialogContent>
                <DialogActions sx={{ p: 2, pt: 0 }}>
                    <Button onClick={() => setDeleteConfirmId(null)} variant="outlined">Cancel</Button>
                    <Button onClick={handleRevoke} color="error" variant="contained" disabled={!!revokingId}>
                        {revokingId ? 'Revoking...' : 'Revoke Link'}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};
