import { useState, useEffect, memo, useCallback, useRef } from 'react';
import {
    Box,
    Paper,
    Typography,
    IconButton,
    TextField,
    Button,
    Avatar,
    CircularProgress,
    useTheme,
    useMediaQuery,
    alpha,
    Drawer,
    Tooltip,
} from '@mui/material';
import {
    Close as CloseIcon,
    Send as SendIcon,
    Delete as DeleteIcon,
    OpenInNew as OpenExternalIcon,
    Comment as CommentIcon,
    ErrorOutline as ErrorIcon,
    MenuOpen as PanelIcon,
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import socialService, { type ReaderContent, type ReaderAnnotation } from '@/services/socialService';
import type { LinkPost } from '@/services/socialService';
import { DialogPortal } from './DialogPortal';
import { SOCIAL_DIALOG_Z_INDEX, SOCIAL_RADIUS_XLARGE, SOCIAL_RADIUS_MEDIUM } from './constants';

interface DecryptedAnnotation extends ReaderAnnotation {
    decryptedContent: string;
}

interface ReaderModeOverlayProps {
    open: boolean;
    onClose: () => void;
    link: LinkPost;
    encryptAnnotation: (text: string) => Promise<string>;
    decryptAnnotation: (encryptedText: string) => Promise<string>;
    currentUserId?: string;
}

export const ReaderModeOverlay = memo(({
    open,
    onClose,
    link,
    encryptAnnotation,
    decryptAnnotation,
    currentUserId,
}: ReaderModeOverlayProps) => {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));

    // Reader content state
    const [readerContent, setReaderContent] = useState<ReaderContent | null>(null);
    const [isLoadingContent, setIsLoadingContent] = useState(true);
    const [contentError, setContentError] = useState<string | null>(null);

    // Annotations state
    const [annotations, setAnnotations] = useState<DecryptedAnnotation[]>([]);
    const [isLoadingAnnotations, setIsLoadingAnnotations] = useState(false);

    // Annotation creation
    const [selectedParagraphId, setSelectedParagraphId] = useState<string | null>(null);
    const [selectedText, setSelectedText] = useState<string>('');
    const [newAnnotation, setNewAnnotation] = useState('');
    const [isPosting, setIsPosting] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);

    // Panel state - hidden by default on all screen sizes
    const [showPanel, setShowPanel] = useState(false);

    const contentRef = useRef<HTMLDivElement>(null);

    // Load reader content
    useEffect(() => {
        if (!open) return;

        const loadContent = async () => {
            setIsLoadingContent(true);
            setContentError(null);
            try {
                const result = await socialService.getReaderContent(link._id);
                setReaderContent(result);

                if (result.status !== 'success') {
                    setContentError(result.error || 'Unable to load article content');
                }
            } catch (error: any) {
                setContentError(error.message || 'Failed to load reader content');
            } finally {
                setIsLoadingContent(false);
            }
        };

        loadContent();
    }, [open, link._id]);

    // Load annotations
    useEffect(() => {
        if (!open || !readerContent || readerContent.status !== 'success') return;

        const loadAnnotations = async () => {
            setIsLoadingAnnotations(true);
            try {
                const rawAnnotations = await socialService.getAnnotations(link._id);

                // Decrypt annotations
                const decrypted: DecryptedAnnotation[] = await Promise.all(
                    rawAnnotations.map(async (annotation) => {
                        let decryptedContent = '[Decryption failed]';
                        try {
                            decryptedContent = await decryptAnnotation(annotation.encryptedContent);
                        } catch {
                            // Keep fallback
                        }
                        return { ...annotation, decryptedContent };
                    })
                );

                setAnnotations(decrypted);
            } catch (error) {
                console.error('Failed to load annotations:', error);
            } finally {
                setIsLoadingAnnotations(false);
            }
        };

        loadAnnotations();
    }, [open, link._id, readerContent, decryptAnnotation]);

    // Handle text selection for annotation
    const handleMouseUp = useCallback(() => {
        const selection = window.getSelection();
        if (!selection || selection.isCollapsed) {
            setSelectedParagraphId(null);
            setSelectedText('');
            return;
        }

        const selectedString = selection.toString().trim();
        if (!selectedString) return;

        // Find the paragraph containing the selection
        const anchorNode = selection.anchorNode;
        if (!anchorNode) return;

        const paragraph = anchorNode.parentElement?.closest('[data-aegis-paragraph="true"]');
        if (paragraph && paragraph.id) {
            setSelectedParagraphId(paragraph.id);
            setSelectedText(selectedString.slice(0, 500));
        }
    }, []);

    // Create annotation
    const handleCreateAnnotation = async () => {
        if (!selectedParagraphId || !selectedText || !newAnnotation.trim() || isPosting) return;

        setIsPosting(true);
        try {
            const encryptedContent = await encryptAnnotation(newAnnotation.trim());
            const annotation = await socialService.createAnnotation(
                link._id,
                selectedParagraphId,
                selectedText,
                encryptedContent
            );

            // Add to local state
            setAnnotations(prev => [
                ...prev,
                { ...annotation, decryptedContent: newAnnotation.trim() }
            ]);

            // Reset form
            setNewAnnotation('');
            setSelectedParagraphId(null);
            setSelectedText('');
            window.getSelection()?.removeAllRanges();
        } catch (error) {
            console.error('Failed to create annotation:', error);
        } finally {
            setIsPosting(false);
        }
    };

    // Delete annotation
    const handleDeleteAnnotation = async (annotationId: string) => {
        setDeletingId(annotationId);
        try {
            await socialService.deleteAnnotation(annotationId);
            setAnnotations(prev => prev.filter(a => a._id !== annotationId));
        } catch (error) {
            console.error('Failed to delete annotation:', error);
        } finally {
            setDeletingId(null);
        }
    };

    const getUsername = (annotation: DecryptedAnnotation): string => {
        return typeof annotation.userId === 'object' ? annotation.userId.username : 'Unknown';
    };

    const getUserId = (annotation: DecryptedAnnotation): string => {
        return typeof annotation.userId === 'object' ? annotation.userId._id : annotation.userId;
    };

    const formatTime = (dateStr: string): string => {
        const date = new Date(dateStr);
        return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    };

    // Render annotation panel content
    const renderAnnotationPanel = () => (
        <Box sx={{
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            bgcolor: theme.palette.background.paper,
        }}>
            {/* Panel Header */}
            <Box sx={{
                p: 2,
                borderBottom: `1px solid ${theme.palette.divider}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
            }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                    Annotations
                </Typography>
                {isMobile && (
                    <IconButton size="small" onClick={() => setShowPanel(false)}>
                        <CloseIcon fontSize="small" />
                    </IconButton>
                )}
            </Box>

            {/* Selection Form */}
            {selectedParagraphId && (
                <Box sx={{ p: 2, borderBottom: `1px solid ${theme.palette.divider}`, bgcolor: alpha(theme.palette.primary.main, 0.05) }}>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                        Selected text:
                    </Typography>
                    <Typography variant="body2" sx={{
                        fontStyle: 'italic',
                        mb: 2,
                        p: 1,
                        bgcolor: alpha(theme.palette.warning.main, 0.1),
                        borderRadius: 1,
                        borderLeft: `3px solid ${theme.palette.warning.main}`,
                        maxHeight: 60,
                        overflow: 'auto',
                    }}>
                        "{selectedText.slice(0, 100)}{selectedText.length > 100 ? '...' : ''}"
                    </Typography>
                    <TextField
                        fullWidth
                        multiline
                        rows={2}
                        placeholder="Add your annotation..."
                        value={newAnnotation}
                        onChange={(e) => setNewAnnotation(e.target.value)}
                        size="small"
                        sx={{ mb: 1 }}
                    />
                    <Box sx={{ display: 'flex', gap: 1 }}>
                        <Button
                            variant="contained"
                            size="small"
                            onClick={handleCreateAnnotation}
                            disabled={!newAnnotation.trim() || isPosting}
                            startIcon={isPosting ? <CircularProgress size={14} /> : <SendIcon />}
                            sx={{ flex: 1 }}
                        >
                            Annotate
                        </Button>
                        <Button
                            variant="outlined"
                            size="small"
                            onClick={() => {
                                setSelectedParagraphId(null);
                                setSelectedText('');
                                setNewAnnotation('');
                            }}
                        >
                            Cancel
                        </Button>
                    </Box>
                </Box>
            )}

            {/* Annotations List */}
            <Box sx={{ flex: 1, overflowY: 'auto', p: 2 }}>
                {isLoadingAnnotations ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                        <CircularProgress size={24} />
                    </Box>
                ) : annotations.length === 0 ? (
                    <Box sx={{ textAlign: 'center', py: 4 }}>
                        <CommentIcon sx={{ fontSize: 40, opacity: 0.2, mb: 1 }} />
                        <Typography color="text.secondary" variant="body2">
                            Select text in the article to add annotations
                        </Typography>
                    </Box>
                ) : (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        {annotations.map((annotation) => (
                            <Paper
                                key={annotation._id}
                                elevation={0}
                                sx={{
                                    p: 2,
                                    borderRadius: SOCIAL_RADIUS_MEDIUM,
                                    border: `1px solid ${theme.palette.divider}`,
                                }}
                            >
                                <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
                                    <Avatar sx={{ width: 28, height: 28, fontSize: '0.75rem', bgcolor: 'primary.main' }}>
                                        {getUsername(annotation).charAt(0).toUpperCase()}
                                    </Avatar>
                                    <Box sx={{ flex: 1, minWidth: 0 }}>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                            <Typography variant="caption" sx={{ fontWeight: 600 }}>
                                                {getUsername(annotation)}
                                            </Typography>
                                            <Typography variant="caption" color="text.secondary">
                                                {formatTime(annotation.createdAt)}
                                            </Typography>
                                            {currentUserId === getUserId(annotation) && (
                                                <IconButton
                                                    size="small"
                                                    onClick={() => handleDeleteAnnotation(annotation._id)}
                                                    disabled={deletingId === annotation._id}
                                                    sx={{ ml: 'auto', opacity: 0.5, '&:hover': { opacity: 1, color: 'error.main' } }}
                                                >
                                                    {deletingId === annotation._id ? <CircularProgress size={14} /> : <DeleteIcon fontSize="small" />}
                                                </IconButton>
                                            )}
                                        </Box>
                                        <Typography
                                            variant="caption"
                                            sx={{
                                                display: 'block',
                                                bgcolor: alpha(theme.palette.warning.main, 0.1),
                                                p: 0.5,
                                                borderRadius: 0.5,
                                                my: 0.5,
                                                fontStyle: 'italic',
                                            }}
                                        >
                                            "{annotation.highlightText.slice(0, 60)}..."
                                        </Typography>
                                        <Typography variant="body2">
                                            {annotation.decryptedContent}
                                        </Typography>
                                    </Box>
                                </Box>
                            </Paper>
                        ))}
                    </Box>
                )}
            </Box>
        </Box>
    );

    return (
        <DialogPortal>
            <AnimatePresence>
                {open && (
                    <>
                        {/* Backdrop */}
                        <Box
                            component={motion.div}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={onClose}
                            sx={{
                                position: 'fixed',
                                inset: 0,
                                zIndex: SOCIAL_DIALOG_Z_INDEX - 1,
                                bgcolor: 'rgba(0, 0, 0, 0.6)',
                                backdropFilter: 'blur(4px)',
                            }}
                        />

                        {/* Floating Panel */}
                        <Box
                            component={motion.div}
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                            sx={{
                                position: 'fixed',
                                // Equal gaps on all sides
                                top: { xs: 12, md: 40 },
                                bottom: { xs: 12, md: 40 },
                                left: { xs: 12, md: 40 },
                                right: { xs: 12, md: 40 },
                                zIndex: SOCIAL_DIALOG_Z_INDEX,
                                // Solid on mobile, glass effect on desktop
                                bgcolor: {
                                    xs: theme.palette.background.paper,
                                    md: alpha(theme.palette.background.paper, 0.85)
                                },
                                backdropFilter: { xs: 'none', md: 'blur(20px)' },
                                borderRadius: { xs: SOCIAL_RADIUS_XLARGE, md: '24px' },
                                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
                                border: { xs: 'none', md: `1px solid ${alpha(theme.palette.divider, 0.2)}` },
                                display: 'flex',
                                flexDirection: 'column',
                                overflow: 'hidden',
                            }}
                        >
                            {/* Header */}
                            <Box
                                sx={{
                                    p: 2,
                                    borderBottom: `1px solid ${theme.palette.divider}`,
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 2,
                                    flexShrink: 0,
                                }}
                            >
                                <IconButton onClick={onClose} aria-label="Close reader">
                                    <CloseIcon />
                                </IconButton>
                                <Box sx={{ flex: 1, minWidth: 0 }}>
                                    <Typography variant="subtitle1" noWrap sx={{ fontWeight: 600 }}>
                                        {readerContent?.title || link.previewData?.title || 'Reader Mode'}
                                    </Typography>
                                    {readerContent?.siteName && (
                                        <Typography variant="caption" color="text.secondary">
                                            {readerContent.siteName}
                                        </Typography>
                                    )}
                                </Box>
                                <Tooltip title="Open in new tab">
                                    <IconButton
                                        onClick={() => window.open(link.url, '_blank', 'noopener,noreferrer')}
                                        aria-label="Open externally"
                                    >
                                        <OpenExternalIcon />
                                    </IconButton>
                                </Tooltip>
                                <Tooltip title={showPanel ? 'Hide annotations' : 'Show annotations'}>
                                    <IconButton
                                        onClick={() => setShowPanel(!showPanel)}
                                        color={showPanel ? 'primary' : 'default'}
                                        aria-label="Toggle annotations panel"
                                    >
                                        <PanelIcon />
                                    </IconButton>
                                </Tooltip>
                            </Box>

                            {/* Main content area */}
                            <Box sx={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
                                {/* Article content */}
                                <Box
                                    ref={contentRef}
                                    onMouseUp={handleMouseUp}
                                    sx={{
                                        flex: 1,
                                        overflowY: 'auto',
                                        p: { xs: 2, md: 4 },
                                        maxWidth: showPanel && !isMobile ? 'calc(100% - 360px)' : '100%',
                                    }}
                                >
                                    {isLoadingContent ? (
                                        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '50vh', gap: 2 }}>
                                            <CircularProgress />
                                            <Typography color="text.secondary">Loading article...</Typography>
                                        </Box>
                                    ) : contentError || readerContent?.status !== 'success' ? (
                                        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '50vh', gap: 2, textAlign: 'center' }}>
                                            <ErrorIcon sx={{ fontSize: 60, color: 'error.main', opacity: 0.5 }} />
                                            <Typography variant="h6">Unable to load article</Typography>
                                            <Typography color="text.secondary" sx={{ maxWidth: 400 }}>
                                                {contentError || 'This website may not support reader mode or blocks content extraction.'}
                                            </Typography>
                                            <Button
                                                variant="contained"
                                                startIcon={<OpenExternalIcon />}
                                                onClick={() => window.open(link.url, '_blank', 'noopener,noreferrer')}
                                            >
                                                Open in new tab
                                            </Button>
                                        </Box>
                                    ) : (
                                        <Box
                                            sx={{
                                                maxWidth: 720,
                                                mx: 'auto',
                                                // Reader typography - use site font
                                                fontFamily: theme.typography.fontFamily,
                                                fontSize: '1.125rem',
                                                lineHeight: 1.8,
                                                color: theme.palette.text.primary,
                                                '& h1, & h2, & h3, & h4, & h5, & h6': {
                                                    fontFamily: theme.typography.fontFamily,
                                                    fontWeight: 700,
                                                    mt: 3,
                                                    mb: 2,
                                                },
                                                '& p': {
                                                    mb: 2,
                                                    position: 'relative',
                                                },
                                                '& [data-aegis-paragraph="true"]': {
                                                    cursor: 'text',
                                                    transition: 'background-color 0.2s',
                                                    borderRadius: 1,
                                                    px: 0.5,
                                                    mx: -0.5,
                                                    '&:hover': {
                                                        bgcolor: alpha(theme.palette.primary.main, 0.05),
                                                    },
                                                },
                                                '& a': {
                                                    color: theme.palette.primary.main,
                                                    textDecoration: 'underline',
                                                },
                                                '& .aegis-download-section': {
                                                    mt: 4,
                                                    p: 3,
                                                    borderRadius: 4,
                                                    bgcolor: alpha(theme.palette.background.paper, 0.4),
                                                    border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                                                    backdropFilter: 'blur(10px)',
                                                    boxShadow: `0 8px 32px ${alpha(theme.palette.common.black, 0.2)}`,
                                                },
                                                '& .aegis-download-header': {
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: 1.5,
                                                    mb: 2.5,
                                                    '& h3': {
                                                        m: 0,
                                                        fontSize: '1.25rem',
                                                        fontWeight: 700,
                                                        color: theme.palette.text.primary,
                                                    },
                                                    '& .header-icon': {
                                                        fontSize: '1.5rem',
                                                    },
                                                },
                                                '& .aegis-download-grid': {
                                                    display: 'flex',
                                                    flexWrap: 'wrap',
                                                    gap: 1.5,
                                                    mb: 3,
                                                },
                                                '& a[data-aegis-download="true"]': {
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    gap: 1,
                                                    px: 2,
                                                    py: 1,
                                                    borderRadius: '100px', // Pill shape
                                                    textDecoration: 'none',
                                                    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                                                    border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                                                    bgcolor: alpha(theme.palette.background.paper, 0.6),
                                                    '&:hover': {
                                                        transform: 'translateY(-2px)',
                                                        boxShadow: `0 4px 12px ${alpha(theme.palette.common.black, 0.2)}`,
                                                        borderColor: alpha(theme.palette.primary.main, 0.4),
                                                    },
                                                    '& .link-label': {
                                                        fontSize: '0.8125rem',
                                                        fontWeight: 600,
                                                        letterSpacing: '0.02em',
                                                        textAlign: 'center',
                                                        color: theme.palette.text.primary,
                                                        whiteSpace: 'nowrap',
                                                    },
                                                    '& .provider-icon': {
                                                        display: 'inline-block',
                                                        width: 8,
                                                        height: 8,
                                                        borderRadius: '50%',
                                                        bgcolor: theme.palette.text.disabled,
                                                    },
                                                    // Provider Specific Colors
                                                    '&[data-aegis-provider="mega"]': {
                                                        '&:hover': { bgcolor: alpha('#ff0000', 0.1), borderColor: '#ff0000' },
                                                        '& .link-label': { color: '#ff4d4d' },
                                                        '& .provider-icon': { bgcolor: '#ff4d4d' }
                                                    },
                                                    '&[data-aegis-provider="mediafire"]': {
                                                        '&:hover': { bgcolor: alpha('#007bff', 0.1), borderColor: '#007bff' },
                                                        '& .link-label': { color: '#4da3ff' },
                                                        '& .provider-icon': { bgcolor: '#4da3ff' }
                                                    },
                                                    '&[data-aegis-provider="terabox"]': {
                                                        '&:hover': { bgcolor: alpha('#ff6b00', 0.1), borderColor: '#ff6b00' },
                                                        '& .link-label': { color: '#ff944d' },
                                                        '& .provider-icon': { bgcolor: '#ff944d' }
                                                    },
                                                    '&[data-aegis-provider="onedrive"]': {
                                                        '&:hover': { bgcolor: alpha('#00a1f1', 0.1), borderColor: '#00a1f1' },
                                                        '& .link-label': { color: '#4dbdff' },
                                                        '& .provider-icon': { bgcolor: '#4dbdff' }
                                                    },
                                                    '&[data-aegis-provider="google-drive"]': {
                                                        '&:hover': { bgcolor: alpha('#34a853', 0.1), borderColor: '#34a853' },
                                                        '& .link-label': { color: '#68c182' },
                                                        '& .provider-icon': { bgcolor: '#68c182' }
                                                    },
                                                    '&[data-aegis-provider="pixeldrain"]': {
                                                        '&:hover': { bgcolor: alpha('#7e57c2', 0.1), borderColor: '#7e57c2' },
                                                        '& .link-label': { color: '#a188d3' },
                                                        '& .provider-icon': { bgcolor: '#a188d3' }
                                                    },
                                                    '&[data-aegis-provider="doodrive"]': {
                                                        '&:hover': { bgcolor: alpha('#fbc02d', 0.1), borderColor: '#fbc02d' },
                                                        '& .link-label': { color: '#fdd835' },
                                                        '& .provider-icon': { bgcolor: '#fdd835' }
                                                    },
                                                },
                                                '& .aegis-password-container': {
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: 1.5,
                                                    p: 2,
                                                    borderRadius: 2,
                                                    bgcolor: alpha(theme.palette.common.black, 0.3),
                                                    border: `1px solid ${alpha(theme.palette.divider, 0.05)}`,
                                                },
                                                '& .password-label': {
                                                    fontSize: '0.875rem',
                                                    fontWeight: 600,
                                                    color: theme.palette.text.secondary,
                                                },
                                                '& .password-value': {
                                                    fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                                                    fontSize: '1rem',
                                                    color: theme.palette.warning.light,
                                                    letterSpacing: '0.05em',
                                                    userSelect: 'all',
                                                    cursor: 'pointer',
                                                    transition: 'color 0.2s',
                                                    '&:hover': {
                                                        color: theme.palette.warning.main,
                                                    }
                                                },
                                                '& img': {
                                                    maxWidth: '100%',
                                                    height: 'auto',
                                                    borderRadius: 2,
                                                    my: 2,
                                                },
                                                '& blockquote': {
                                                    borderLeft: `4px solid ${theme.palette.primary.main}`,
                                                    pl: 2,
                                                    ml: 0,
                                                    fontStyle: 'italic',
                                                    color: theme.palette.text.secondary,
                                                },
                                                '& pre, & code': {
                                                    fontFamily: 'monospace',
                                                    bgcolor: alpha(theme.palette.text.primary, 0.05),
                                                    borderRadius: 1,
                                                    p: 0.5,
                                                },
                                                '& pre': {
                                                    p: 2,
                                                    overflowX: 'auto',
                                                },
                                            }}
                                            dangerouslySetInnerHTML={{ __html: readerContent.content }}
                                        />
                                    )}
                                </Box>

                                {/* Annotations panel - Desktop */}
                                {!isMobile && showPanel && (
                                    <Box
                                        sx={{
                                            width: 360,
                                            borderLeft: `1px solid ${theme.palette.divider}`,
                                            flexShrink: 0,
                                            overflow: 'hidden',
                                        }}
                                    >
                                        {renderAnnotationPanel()}
                                    </Box>
                                )}

                                {/* Annotations drawer - Mobile */}
                                {isMobile && (
                                    <Drawer
                                        anchor="bottom"
                                        open={showPanel}
                                        onClose={() => setShowPanel(false)}
                                        PaperProps={{
                                            sx: {
                                                height: '70vh',
                                                borderTopLeftRadius: SOCIAL_RADIUS_XLARGE,
                                                borderTopRightRadius: SOCIAL_RADIUS_XLARGE,
                                            }
                                        }}
                                    >
                                        {renderAnnotationPanel()}
                                    </Drawer>
                                )}
                            </Box>
                        </Box>
                    </>
                )}
            </AnimatePresence>
        </DialogPortal>
    );
});
