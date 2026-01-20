import { useState, useEffect, useCallback, useRef } from 'react';
import {
    Dialog,
    Box,
    IconButton,
    Typography,
    CircularProgress,
    alpha,
    useTheme,
    Fade
} from '@mui/material';
import {
    Close as CloseIcon,
    ChevronLeft as ChevronLeftIcon,
    ChevronRight as ChevronRightIcon,
    FileDownload as DownloadIcon,
    BrokenImage as BrokenImageIcon
} from '@mui/icons-material';
import { type FileMetadata } from '@/services/vaultService';
import { useImageGallery } from '@/hooks/useImageGallery';
import { useVaultDownload } from '@/hooks/useVaultDownload';

interface ImagePreviewOverlayProps {
    isOpen: boolean;
    onClose: () => void;
    files: FileMetadata[];
    initialFileId: string;
}

export const ImagePreviewOverlay = ({
    isOpen,
    onClose,
    files,
    initialFileId
}: ImagePreviewOverlayProps) => {
    const theme = useTheme();
    const { downloadAndDecrypt } = useVaultDownload();

    const [currentIndex, setCurrentIndex] = useState(() => {
        const index = files.findIndex(f => f._id === initialFileId);
        return index >= 0 ? index : 0;
    });
    const [isDownloading, setIsDownloading] = useState(false);

    // Touch handling state
    const touchStartX = useRef<number | null>(null);
    const touchEndX = useRef<number | null>(null);
    const minSwipeDistance = 50;

    // Use the image gallery hook
    const { currentBlobUrl, isLoading, error } = useImageGallery(
        files,
        currentIndex,
        isOpen
    );

    // Current file info
    const currentFile = files[currentIndex];
    const hasNext = currentIndex < files.length - 1;
    const hasPrev = currentIndex > 0;

    // Navigation handlers
    const goNext = useCallback(() => {
        if (hasNext) {
            setCurrentIndex(prev => prev + 1);
        }
    }, [hasNext]);

    const goPrev = useCallback(() => {
        if (hasPrev) {
            setCurrentIndex(prev => prev - 1);
        }
    }, [hasPrev]);

    // Keyboard navigation
    useEffect(() => {
        if (!isOpen) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            switch (e.key) {
                case 'ArrowLeft':
                    e.preventDefault();
                    goPrev();
                    break;
                case 'ArrowRight':
                    e.preventDefault();
                    goNext();
                    break;
                case 'Escape':
                    e.preventDefault();
                    onClose();
                    break;
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, goNext, goPrev, onClose]);

    // Touch swipe handlers
    const onTouchStart = (e: React.TouchEvent) => {
        touchEndX.current = null;
        touchStartX.current = e.targetTouches[0].clientX;
    };

    const onTouchMove = (e: React.TouchEvent) => {
        touchEndX.current = e.targetTouches[0].clientX;
    };

    const onTouchEnd = () => {
        if (!touchStartX.current || !touchEndX.current) return;

        const distance = touchStartX.current - touchEndX.current;
        const isLeftSwipe = distance > minSwipeDistance;
        const isRightSwipe = distance < -minSwipeDistance;

        if (isLeftSwipe) {
            goNext();
        } else if (isRightSwipe) {
            goPrev();
        }

        touchStartX.current = null;
        touchEndX.current = null;
    };

    // Download handler
    const handleDownload = async () => {
        if (!currentFile || isDownloading) return;

        try {
            setIsDownloading(true);
            const blob = await downloadAndDecrypt(currentFile);
            if (!blob) return;

            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = currentFile.originalFileName;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } catch (err) {
            console.error('Download failed:', err);
        } finally {
            setIsDownloading(false);
        }
    };

    if (!currentFile) return null;

    return (
        <Dialog
            open={isOpen}
            onClose={onClose}
            fullScreen
            PaperProps={{
                sx: {
                    bgcolor: 'transparent',
                    backgroundImage: 'none',
                    boxShadow: 'none',
                }
            }}
            sx={{
                '& .MuiBackdrop-root': {
                    bgcolor: alpha('#000', 0.98),
                }
            }}
        >
            {/* Top Toolbar */}
            <Box
                sx={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    p: { xs: 1.5, sm: 2 },
                    background: `linear-gradient(to bottom, ${alpha('#000', 0.7)}, transparent)`,
                    zIndex: 10,
                }}
            >
                {/* File info */}
                <Box sx={{ minWidth: 0, flex: 1 }}>
                    <Typography
                        variant="subtitle1"
                        sx={{
                            fontWeight: 700,
                            color: 'white',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            maxWidth: { xs: '200px', sm: '400px', md: '600px' }
                        }}
                    >
                        {currentFile.originalFileName}
                    </Typography>
                    <Typography
                        variant="caption"
                        sx={{ color: alpha('#fff', 0.6), fontWeight: 500 }}
                    >
                        {currentIndex + 1} of {files.length}
                    </Typography>
                </Box>

                {/* Action buttons */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <IconButton
                        onClick={handleDownload}
                        disabled={isDownloading}
                        sx={{
                            color: 'white',
                            bgcolor: alpha('#fff', 0.1),
                            '&:hover': { bgcolor: alpha('#fff', 0.2) },
                            '&:disabled': { color: alpha('#fff', 0.3) }
                        }}
                    >
                        {isDownloading ? (
                            <CircularProgress size={24} sx={{ color: 'white' }} />
                        ) : (
                            <DownloadIcon />
                        )}
                    </IconButton>
                    <IconButton
                        onClick={onClose}
                        sx={{
                            color: 'white',
                            bgcolor: alpha('#fff', 0.1),
                            '&:hover': { bgcolor: alpha('#fff', 0.2) }
                        }}
                    >
                        <CloseIcon />
                    </IconButton>
                </Box>
            </Box>

            {/* Main Image Area */}
            <Box
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '100%',
                    height: '100%',
                    px: { xs: 1, sm: 2, md: 4 },
                    pt: { xs: 6, sm: 6 },
                    pb: { xs: 1, sm: 1 },
                    userSelect: 'none',
                }}
                onTouchStart={onTouchStart}
                onTouchMove={onTouchMove}
                onTouchEnd={onTouchEnd}
            >
                {/* Loading State */}
                {isLoading && (
                    <Box
                        sx={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: 2,
                        }}
                    >
                        <CircularProgress
                            size={48}
                            thickness={4}
                            sx={{ color: theme.palette.primary.main }}
                        />
                        <Typography
                            variant="body2"
                            sx={{ color: alpha('#fff', 0.6), fontWeight: 600 }}
                        >
                            Decrypting image...
                        </Typography>
                    </Box>
                )}

                {/* Error State */}
                {error && !isLoading && (
                    <Box
                        sx={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: 2,
                            textAlign: 'center',
                            p: 4,
                        }}
                    >
                        <BrokenImageIcon
                            sx={{ fontSize: 64, color: alpha('#fff', 0.3) }}
                        />
                        <Typography
                            variant="h6"
                            sx={{ color: alpha('#fff', 0.7), fontWeight: 600 }}
                        >
                            Failed to load image
                        </Typography>
                        <Typography
                            variant="body2"
                            sx={{ color: alpha('#fff', 0.4), maxWidth: 300 }}
                        >
                            {error}
                        </Typography>
                    </Box>
                )}

                {/* Image */}
                {currentBlobUrl && !isLoading && !error && (
                    <Fade in timeout={300}>
                        <img
                            src={currentBlobUrl}
                            alt={currentFile.originalFileName}
                            style={{
                                maxWidth: '100%',
                                maxHeight: '100%',
                                objectFit: 'contain',
                                borderRadius: '8px',
                                boxShadow: `0 20px 60px ${alpha('#000', 0.5)}`,
                            }}
                            draggable={false}
                        />
                    </Fade>
                )}
            </Box>

            {/* Navigation Arrows - Desktop */}
            <Box
                sx={{
                    display: { xs: 'none', md: 'flex' },
                    position: 'absolute',
                    left: 0,
                    right: 0,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    justifyContent: 'space-between',
                    px: 2,
                    pointerEvents: 'none',
                }}
            >
                <IconButton
                    onClick={goPrev}
                    disabled={!hasPrev}
                    sx={{
                        pointerEvents: 'auto',
                        color: 'white',
                        bgcolor: alpha('#fff', 0.1),
                        width: 56,
                        height: 56,
                        opacity: hasPrev ? 1 : 0.3,
                        transition: 'all 0.2s ease',
                        '&:hover': {
                            bgcolor: alpha('#fff', 0.2),
                            transform: 'scale(1.1)',
                        },
                        '&:disabled': {
                            color: alpha('#fff', 0.2),
                        }
                    }}
                >
                    <ChevronLeftIcon sx={{ fontSize: 32 }} />
                </IconButton>

                <IconButton
                    onClick={goNext}
                    disabled={!hasNext}
                    sx={{
                        pointerEvents: 'auto',
                        color: 'white',
                        bgcolor: alpha('#fff', 0.1),
                        width: 56,
                        height: 56,
                        opacity: hasNext ? 1 : 0.3,
                        transition: 'all 0.2s ease',
                        '&:hover': {
                            bgcolor: alpha('#fff', 0.2),
                            transform: 'scale(1.1)',
                        },
                        '&:disabled': {
                            color: alpha('#fff', 0.2),
                        }
                    }}
                >
                    <ChevronRightIcon sx={{ fontSize: 32 }} />
                </IconButton>
            </Box>

            {/* Navigation Dots - Mobile */}
            {files.length > 1 && (
                <Box
                    sx={{
                        display: { xs: 'flex', md: 'none' },
                        position: 'absolute',
                        bottom: 16,
                        left: '50%',
                        transform: 'translateX(-50%)',
                        gap: 0.75,
                        alignItems: 'center',
                    }}
                >
                    {files.slice(
                        Math.max(0, currentIndex - 3),
                        Math.min(files.length, currentIndex + 4)
                    ).map((file, idx) => {
                        const actualIndex = Math.max(0, currentIndex - 3) + idx;
                        const isActive = actualIndex === currentIndex;
                        return (
                            <Box
                                key={file._id}
                                onClick={() => setCurrentIndex(actualIndex)}
                                sx={{
                                    width: isActive ? 24 : 8,
                                    height: 8,
                                    borderRadius: 4,
                                    bgcolor: isActive
                                        ? theme.palette.primary.main
                                        : alpha('#fff', 0.4),
                                    transition: 'all 0.2s ease',
                                    cursor: 'pointer',
                                    '&:hover': {
                                        bgcolor: isActive
                                            ? theme.palette.primary.main
                                            : alpha('#fff', 0.6),
                                    }
                                }}
                            />
                        );
                    })}
                </Box>
            )}
        </Dialog>
    );
};

export default ImagePreviewOverlay;
