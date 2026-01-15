import React, { useState } from 'react';
import {
    Box,
    Paper,
    Typography,
    LinearProgress,
    IconButton,
    Stack,
    alpha,
    useTheme,
    Collapse,
    Fade
} from '@mui/material';
import {
    ExpandLess as MinimizeIcon,
    ExpandMore as ExpandIcon,
    Close as CloseIcon,
    CheckCircle as SuccessIcon,
    Error as ErrorIcon,
    InsertDriveFile as FileIcon,
    Image as ImageIcon,
    PictureAsPdf as PdfIcon,
    VideoFile as VideoIcon,
    AudioFile as AudioIcon,
    FolderZip as ArchiveIcon
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import { type UploadItem } from '../../stores/useUploadStore';
import { useVaultUpload } from '../../hooks/useVaultUpload';

interface UploadManagerProps { }

// Get file icon based on mime type
const getFileIcon = (fileName: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase() || '';

    if (['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp', 'bmp'].includes(ext)) return ImageIcon;
    if (ext === 'pdf') return PdfIcon;
    if (['mp4', 'mkv', 'avi', 'mov', 'webm'].includes(ext)) return VideoIcon;
    if (['mp3', 'wav', 'flac', 'aac', 'ogg'].includes(ext)) return AudioIcon;
    if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) return ArchiveIcon;

    return FileIcon;
};

// Truncate filename for display
const truncateFileName = (name: string, maxLength: number = 24) => {
    if (name.length <= maxLength) return name;
    const ext = name.split('.').pop() || '';
    const baseName = name.slice(0, name.length - ext.length - 1);
    const truncatedBase = baseName.slice(0, maxLength - ext.length - 4);
    return `${truncatedBase}...${ext}`;
};

// Memoized individual upload item row to prevent unnecessary re-renders
const UploadItemRow = React.memo(({
    upload,
    theme,
    getFileIcon,
    truncateFileName
}: {
    upload: UploadItem;
    theme: any;
    getFileIcon: (name: string) => React.ElementType;
    truncateFileName: (name: string, max?: number) => string;
}) => {
    const FileIconComponent = getFileIcon(upload.file.name);
    const isActive = upload.status === 'encrypting' || upload.status === 'uploading';
    const isPending = upload.status === 'pending';
    const isComplete = upload.status === 'completed';
    const isError = upload.status === 'error';

    return (
        <Box
            sx={{
                px: 2,
                py: 1.25,
                display: 'flex',
                alignItems: 'center',
                gap: 1.5,
                borderBottom: `1px solid ${alpha(theme.palette.divider, 0.05)}`,
                transition: 'background-color 0.2s',
                '&:hover': {
                    bgcolor: alpha(theme.palette.text.primary, 0.02),
                },
                '&:last-child': { borderBottom: 'none' },
            }}
        >
            {/* File Icon */}
            <Box
                sx={{
                    p: 0.75,
                    borderRadius: '8px',
                    bgcolor: alpha(theme.palette.primary.main, 0.1),
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                }}
            >
                <FileIconComponent
                    sx={{
                        fontSize: 18,
                        color: isError ? 'error.main' : 'primary.main',
                        opacity: isPending ? 0.5 : 1,
                    }}
                />
            </Box>

            {/* File Info */}
            <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography
                    variant="caption"
                    sx={{
                        display: 'block',
                        fontWeight: 600,
                        color: isError ? 'error.main' : 'text.primary',
                        opacity: isPending ? 0.6 : 1,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                    }}
                >
                    {truncateFileName(upload.file.name)}
                </Typography>
                {(isActive || isPending) && (
                    <LinearProgress
                        variant={isPending ? 'indeterminate' : 'determinate'}
                        value={upload.progress}
                        sx={{
                            mt: 0.5,
                            height: 3,
                            borderRadius: 1.5,
                            bgcolor: alpha(theme.palette.primary.main, 0.1),
                            '& .MuiLinearProgress-bar': {
                                borderRadius: 1.5,
                                // Disable slow transitions for active uploads
                                transition: isActive ? 'none' : undefined,
                            },
                        }}
                    />
                )}
                {isError && (
                    <Typography
                        variant="caption"
                        sx={{ color: 'error.main', fontSize: 10 }}
                    >
                        {upload.error || 'Upload failed'}
                    </Typography>
                )}
            </Box>

            {/* Status Icon */}
            <Box sx={{ flexShrink: 0 }}>
                {isActive && (
                    <Typography
                        variant="caption"
                        sx={{
                            fontWeight: 700,
                            fontFamily: 'JetBrains Mono',
                            color: 'primary.main',
                            fontSize: 11,
                        }}
                    >
                        {upload.progress}%
                    </Typography>
                )}
                {isPending && (
                    <Typography
                        variant="caption"
                        sx={{
                            color: 'text.secondary',
                            fontSize: 10,
                            fontWeight: 600,
                        }}
                    >
                        Queued
                    </Typography>
                )}
                {isComplete && (
                    <SuccessIcon sx={{ fontSize: 18, color: 'success.main' }} />
                )}
                {isError && (
                    <ErrorIcon sx={{ fontSize: 18, color: 'error.main' }} />
                )}
            </Box>
        </Box>
    );
});

const UploadManager: React.FC<UploadManagerProps> = () => {
    const { activeUploads: uploads, globalState, clearCompleted: onClearCompleted } = useVaultUpload();
    const globalProgress = globalState.progress;

    const [isMinimized, setIsMinimized] = useState(false);
    const [isDismissed, setIsDismissed] = useState(false);
    const theme = useTheme();

    // Calculate stats
    const completedCount = uploads.filter((u: UploadItem) => u.status === 'completed').length;
    const errorCount = uploads.filter((u: UploadItem) => u.status === 'error').length;
    const activeCount = uploads.filter((u: UploadItem) =>
        u.status === 'pending' || u.status === 'encrypting' || u.status === 'uploading'
    ).length;
    const totalCount = uploads.length;

    const hasActiveUploads = activeCount > 0;

    // Auto-show when new uploads start
    React.useEffect(() => {
        if (hasActiveUploads && isDismissed) {
            setIsDismissed(false);
        }
    }, [hasActiveUploads, isDismissed]);

    // Don't show if no uploads or if dismissed
    if (totalCount === 0 || isDismissed) return null;

    // Build header text
    const getHeaderText = () => {
        if (activeCount > 0) {
            return `Uploading ${activeCount} item${activeCount !== 1 ? 's' : ''}...`;
        }
        if (completedCount === totalCount) {
            return `${completedCount} item${completedCount !== 1 ? 's' : ''} uploaded`;
        }
        if (errorCount > 0) {
            return `${completedCount}/${totalCount} completed, ${errorCount} failed`;
        }
        return `${completedCount}/${totalCount} completed`;
    };

    const handleDismiss = () => {
        if (onClearCompleted) onClearCompleted();
        setIsDismissed(true);
    };

    return (
        <AnimatePresence>
            <Box
                component={motion.div}
                initial={{ opacity: 0, y: 100, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 100, scale: 0.9 }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                sx={{
                    position: 'fixed',
                    bottom: 24,
                    right: 24,
                    zIndex: 1400,
                    width: 360,
                    maxWidth: 'calc(100vw - 48px)',
                    willChange: 'transform, opacity',
                }}
            >
                <Paper
                    elevation={16}
                    variant="solid"
                    sx={{
                        borderRadius: '16px',
                        overflow: 'hidden',
                        bgcolor: theme.palette.background.paper, // Solid opaque
                        backgroundImage: 'none',
                        backdropFilter: 'none',
                        border: `1px solid ${theme.palette.divider}`,
                        boxShadow: theme.shadows[16],
                    }}
                >
                    {/* Header */}
                    <Box
                        sx={{
                            px: 2,
                            py: 1.5,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            borderBottom: isMinimized ? 'none' : `1px solid ${theme.palette.divider}`,
                            bgcolor: theme.palette.background.default, // Solid opaque contrast
                        }}
                    >
                        <Stack direction="row" spacing={1.5} alignItems="center">
                            {activeCount > 0 && (
                                <Box
                                    sx={{
                                        width: 18,
                                        height: 18,
                                        borderRadius: '50%',
                                        border: `2px solid ${alpha(theme.palette.primary.main, 0.3)}`,
                                        borderTopColor: theme.palette.primary.main,
                                        animation: 'spin 1s linear infinite',
                                        '@keyframes spin': {
                                            '0%': { transform: 'rotate(0deg)' },
                                            '100%': { transform: 'rotate(360deg)' },
                                        },
                                    }}
                                />
                            )}
                            {activeCount === 0 && completedCount === totalCount && (
                                <SuccessIcon sx={{ fontSize: 20, color: 'success.main' }} />
                            )}
                            {activeCount === 0 && errorCount > 0 && (
                                <ErrorIcon sx={{ fontSize: 20, color: 'error.main' }} />
                            )}
                            <Typography variant="body2" sx={{ fontWeight: 700 }}>
                                {getHeaderText()}
                            </Typography>
                        </Stack>
                        <Stack direction="row" spacing={0.5}>
                            <IconButton
                                size="small"
                                onClick={() => setIsMinimized(!isMinimized)}
                                sx={{ color: 'text.secondary' }}
                            >
                                {isMinimized ? <ExpandIcon fontSize="small" /> : <MinimizeIcon fontSize="small" />}
                            </IconButton>
                            {activeCount === 0 && (
                                <Fade in>
                                    <IconButton
                                        size="small"
                                        onClick={handleDismiss}
                                        sx={{ color: 'text.secondary' }}
                                    >
                                        <CloseIcon fontSize="small" />
                                    </IconButton>
                                </Fade>
                            )}
                        </Stack>
                    </Box>

                    {/* Global Progress (always visible) */}
                    {activeCount > 0 && (
                        <LinearProgress
                            variant="determinate"
                            value={globalProgress}
                            sx={{
                                height: 3,
                                bgcolor: alpha(theme.palette.primary.main, 0.1),
                                '& .MuiLinearProgress-bar': {
                                    bgcolor: theme.palette.primary.main,
                                    transition: 'none',
                                },
                            }}
                        />
                    )}

                    {/* File List (collapsible) */}
                    <Collapse in={!isMinimized}>
                        <Box
                            sx={{
                                maxHeight: 280,
                                overflowY: 'auto',
                                '&::-webkit-scrollbar': { width: 6 },
                                '&::-webkit-scrollbar-thumb': {
                                    bgcolor: alpha(theme.palette.text.primary, 0.2),
                                    borderRadius: 3,
                                },
                            }}
                        >
                            {uploads.map((upload: UploadItem) => (
                                <UploadItemRow
                                    key={upload.id}
                                    upload={upload}
                                    theme={theme}
                                    getFileIcon={getFileIcon}
                                    truncateFileName={truncateFileName}
                                />
                            ))}
                        </Box>
                    </Collapse>
                </Paper>
            </Box>
        </AnimatePresence>
    );
};

export default UploadManager;
