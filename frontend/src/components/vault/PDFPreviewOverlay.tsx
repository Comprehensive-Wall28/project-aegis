import { useState, useEffect, useCallback, useRef } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import {
    Dialog,
    Box,
    IconButton,
    Typography,
    CircularProgress,
    alpha,
    useTheme,
    Fade,
    Stack
} from '@mui/material';
import {
    Close as CloseIcon,
    ChevronLeft as ChevronLeftIcon,
    ChevronRight as ChevronRightIcon,
    FileDownload as DownloadIcon,
    PictureAsPdf as PdfIcon,
    BrokenImage as BrokenImageIcon
} from '@mui/icons-material';
import { type FileMetadata } from '@/services/vaultService';
import { usePDFPreview } from '@/hooks/usePDFPreview';
import { useVaultDownload } from '@/hooks/useVaultDownload';

// Configure PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface PDFPreviewOverlayProps {
    isOpen: boolean;
    onClose: () => void;
    file: FileMetadata | null;
}

export const PDFPreviewOverlay = ({
    isOpen,
    onClose,
    file
}: PDFPreviewOverlayProps) => {
    const theme = useTheme();
    const { downloadAndDecrypt } = useVaultDownload();

    const [currentPage, setCurrentPage] = useState(1);
    const [numPages, setNumPages] = useState<number | null>(null);
    const [isDownloading, setIsDownloading] = useState(false);
    const [containerWidth, setContainerWidth] = useState<number>(800);
    const containerRef = useRef<HTMLDivElement>(null);

    // Touch handling state
    const touchStartX = useRef<number | null>(null);
    const touchEndX = useRef<number | null>(null);
    const minSwipeDistance = 50;

    // Use the PDF preview hook
    const { blobUrl, isLoading, error } = usePDFPreview(file, isOpen);

    // Reset page when file changes
    useEffect(() => {
        setCurrentPage(1);
        setNumPages(null);
    }, [file?._id]);

    // Measure container width for responsive PDF sizing
    useEffect(() => {
        const updateWidth = () => {
            if (containerRef.current) {
                const width = containerRef.current.offsetWidth;
                // Use ZERO padding on mobile (xs) to ensure edge-to-edge spanning
                const isMobile = window.innerWidth < 600;
                const padding = isMobile ? 0 : 48;
                setContainerWidth(Math.min(width - padding, 1000));
            }
        };

        updateWidth();
        window.addEventListener('resize', updateWidth);
        return () => window.removeEventListener('resize', updateWidth);
    }, [isOpen]);

    // PDF load success handler
    const onDocumentLoadSuccess = useCallback(({ numPages }: { numPages: number }) => {
        setNumPages(numPages);
    }, []);

    // Navigation handlers
    const goNext = useCallback(() => {
        if (numPages && currentPage < numPages) {
            setCurrentPage(prev => prev + 1);
        }
    }, [numPages, currentPage]);

    const goPrev = useCallback(() => {
        if (currentPage > 1) {
            setCurrentPage(prev => prev - 1);
        }
    }, [currentPage]);

    const hasNext = numPages !== null && currentPage < numPages;
    const hasPrev = currentPage > 1;

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
        if (!file || isDownloading) return;

        try {
            setIsDownloading(true);
            const blob = await downloadAndDecrypt(file);
            if (!blob) return;

            const url = window.URL.createObjectURL(blob);
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
            setIsDownloading(false);
        }
    };

    if (!file) return null;

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
                    bgcolor: alpha('#000', 0.95),
                    backdropFilter: 'blur(20px)',
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
                        {file.originalFileName}
                    </Typography>
                    <Typography
                        variant="caption"
                        sx={{ color: alpha('#fff', 0.6), fontWeight: 500 }}
                    >
                        {numPages !== null ? `Page ${currentPage} of ${numPages}` : 'Loading...'}
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

            {/* Main PDF Area */}
            <Box
                ref={containerRef}
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '100%',
                    height: '100%',
                    px: { xs: 0, sm: 2, md: 4 },
                    pt: { xs: 8, sm: 8 }, // More space for the toolbar on mobile
                    pb: { xs: 10, sm: 2 }, // Extra bottom padding for mobile navigation bar
                    userSelect: 'none',
                    overflow: 'auto',
                    WebkitOverflowScrolling: 'touch',
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
                            Decrypting PDF...
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
                            Failed to load PDF
                        </Typography>
                        <Typography
                            variant="body2"
                            sx={{ color: alpha('#fff', 0.4), maxWidth: 300 }}
                        >
                            {error}
                        </Typography>
                    </Box>
                )}

                {/* PDF Document */}
                {blobUrl && !isLoading && !error && (
                    <Fade in timeout={300}>
                        <Box
                            sx={{
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                '& .react-pdf__Document': {
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                },
                                '& .react-pdf__Page': {
                                    boxShadow: { xs: 'none', sm: `0 20px 60px ${alpha('#000', 0.5)}` },
                                    borderRadius: { xs: 0, sm: '8px' },
                                    overflow: 'hidden',
                                    maxWidth: '100vw',
                                },
                                '& .react-pdf__Page__canvas': {
                                    borderRadius: { xs: 0, sm: '8px' },
                                    maxWidth: '100% !important',
                                    height: 'auto !important',
                                }
                            }}
                        >
                            <Document
                                file={blobUrl}
                                onLoadSuccess={onDocumentLoadSuccess}
                                loading={
                                    <Stack alignItems="center" spacing={2} sx={{ py: 8 }}>
                                        <PdfIcon sx={{ fontSize: 64, color: alpha('#fff', 0.3) }} />
                                        <CircularProgress size={32} sx={{ color: 'primary.main' }} />
                                        <Typography variant="caption" sx={{ color: alpha('#fff', 0.5) }}>
                                            Rendering PDF...
                                        </Typography>
                                    </Stack>
                                }
                                error={
                                    <Stack alignItems="center" spacing={2} sx={{ py: 8 }}>
                                        <BrokenImageIcon sx={{ fontSize: 64, color: alpha('#fff', 0.3) }} />
                                        <Typography sx={{ color: alpha('#fff', 0.6) }}>
                                            Failed to render PDF
                                        </Typography>
                                    </Stack>
                                }
                            >
                                <Page
                                    pageNumber={currentPage}
                                    width={containerWidth}
                                    renderTextLayer={true}
                                    renderAnnotationLayer={true}
                                />
                            </Document>
                        </Box>
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
                        backdropFilter: 'blur(8px)',
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
                        backdropFilter: 'blur(8px)',
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

            {/* Page Navigation - Mobile */}
            {numPages !== null && numPages > 1 && (
                <Box
                    sx={{
                        display: { xs: 'flex', md: 'none' },
                        position: 'absolute',
                        bottom: 16,
                        left: '50%',
                        transform: 'translateX(-50%)',
                        gap: 2,
                        alignItems: 'center',
                        bgcolor: alpha('#000', 0.6),
                        backdropFilter: 'blur(8px)',
                        borderRadius: '24px',
                        px: 2,
                        py: 1,
                    }}
                >
                    <IconButton
                        onClick={goPrev}
                        disabled={!hasPrev}
                        size="small"
                        sx={{
                            color: 'white',
                            '&:disabled': { color: alpha('#fff', 0.3) }
                        }}
                    >
                        <ChevronLeftIcon />
                    </IconButton>
                    <Typography
                        variant="body2"
                        sx={{ color: 'white', fontWeight: 600, minWidth: '80px', textAlign: 'center' }}
                    >
                        {currentPage} / {numPages}
                    </Typography>
                    <IconButton
                        onClick={goNext}
                        disabled={!hasNext}
                        size="small"
                        sx={{
                            color: 'white',
                            '&:disabled': { color: alpha('#fff', 0.3) }
                        }}
                    >
                        <ChevronRightIcon />
                    </IconButton>
                </Box>
            )}
        </Dialog>
    );
};

export default PDFPreviewOverlay;
