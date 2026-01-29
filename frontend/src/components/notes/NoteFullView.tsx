import { memo, useEffect } from 'react';
import {
    Box,
    Typography,
    IconButton,
    useTheme,
    useMediaQuery,
    alpha,
} from '@mui/material';
import {
    Close as CloseIcon,
    KeyboardDoubleArrowUp as MinimizeIcon,
    ExpandMore as ExpandIcon,
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import { DialogPortal } from '../social/DialogPortal';
import { SOCIAL_DIALOG_Z_INDEX, SOCIAL_RADIUS_XLARGE } from '../social/constants';
import type { DecryptedNote } from '../../hooks/useNotesCrud';

interface NoteFullViewProps {
    open: boolean;
    onClose: () => void;
    note: DecryptedNote;
    decryptedTitle: string;
    containerRef: (node: HTMLElement | null) => void;
    isZenMode: boolean;
    onToggleZenMode: () => void;
}

export const NoteFullView = memo(({
    open,
    onClose,
    note,
    decryptedTitle,
    containerRef,
    isZenMode,
    onToggleZenMode,
}: NoteFullViewProps) => {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));
    // Removed isZenMode state - now controlled by parent

    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && open) {
                onClose();
            }
            // Toggle Zen Mode: Ctrl+Alt+Z
            if ((e.ctrlKey || e.metaKey) && e.altKey && e.key.toLowerCase() === 'z') {
                e.preventDefault();
                onToggleZenMode();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onClose, open, onToggleZenMode]);

    if (!note) return null;

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
                                bgcolor: 'rgba(0, 0, 0, 0.7)',
                                backdropFilter: 'blur(8px)',
                            }}
                        />

                        {/* Full View Panel */}
                        <Box
                            component={motion.div}
                            initial={{ opacity: 0, scale: 0.98, y: 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.98, y: 10 }}
                            transition={{ type: 'spring', damping: 30, stiffness: 400 }}
                            sx={{
                                position: 'fixed',
                                top: { xs: 0, md: 24 },
                                bottom: { xs: 0, md: 24 },
                                left: { xs: 0, md: 24 },
                                right: { xs: 0, md: 24 },
                                zIndex: SOCIAL_DIALOG_Z_INDEX,
                                // Solid background as requested (no glass effects)
                                bgcolor: 'background.paper',
                                borderRadius: { xs: 0, md: SOCIAL_RADIUS_XLARGE },
                                boxShadow: '0 32px 64px -12px rgba(0, 0, 0, 0.6)',
                                border: { xs: 'none', md: `1px solid ${alpha(theme.palette.divider, 0.2)}` },
                                display: 'flex',
                                flexDirection: 'column',
                                overflow: 'hidden',
                            }}
                        >
                            {/* Header */}
                            <AnimatePresence initial={false}>
                                {!isZenMode && (
                                    <Box
                                        component={motion.div}
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: 'auto', opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        transition={{ duration: 0.3, ease: 'easeInOut' }}
                                        sx={{
                                            flexShrink: 0,
                                            bgcolor: alpha(theme.palette.background.paper, 0.5),
                                            overflow: 'hidden',
                                        }}
                                    >
                                        <Box sx={{
                                            p: 2,
                                            px: { xs: 2, md: 3 },
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 2,
                                            borderBottom: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                                        }}>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                <IconButton onClick={onClose} edge="start" aria-label="Close full view">
                                                    <CloseIcon />
                                                </IconButton>
                                                {!isMobile && (
                                                    <Typography
                                                        variant="caption"
                                                        sx={{
                                                            bgcolor: alpha(theme.palette.text.primary, 0.05),
                                                            px: 0.8,
                                                            py: 0.3,
                                                            borderRadius: '6px',
                                                            fontSize: '0.65rem',
                                                            fontWeight: 800,
                                                            color: theme.palette.text.secondary,
                                                            border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                                                            userSelect: 'none',
                                                        }}
                                                    >
                                                        ESC
                                                    </Typography>
                                                )}
                                            </Box>
                                            <Box sx={{ flex: 1, minWidth: 0 }}>
                                                <Typography variant="subtitle1" noWrap sx={{ fontWeight: 700 }}>
                                                    {decryptedTitle || 'Untitled Note'}
                                                </Typography>
                                                <Typography variant="caption" color="text.secondary">
                                                    Last modified {new Date(note.metadata.updatedAt).toLocaleDateString()}
                                                </Typography>
                                            </Box>

                                            <IconButton
                                                onClick={onToggleZenMode}
                                                size="small"
                                                sx={{
                                                    bgcolor: alpha(theme.palette.text.primary, 0.03),
                                                    '&:hover': { bgcolor: alpha(theme.palette.text.primary, 0.08) }
                                                }}
                                                title="Zen Mode"
                                            >
                                                <MinimizeIcon fontSize="small" />
                                            </IconButton>
                                        </Box>
                                    </Box>
                                )}
                            </AnimatePresence>

                            {/* Restore Button (Floating) */}
                            {isZenMode && (
                                <Box
                                    component={motion.div}
                                    initial={{ y: -20, opacity: 0 }}
                                    animate={{ y: 0, opacity: 1 }}
                                    sx={{
                                        position: 'absolute',
                                        top: 16,
                                        right: 24,
                                        zIndex: 10,
                                    }}
                                >
                                    <IconButton
                                        onClick={onToggleZenMode}
                                        sx={{
                                            bgcolor: theme.palette.background.paper,
                                            boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
                                            border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                                            '&:hover': {
                                                bgcolor: alpha(theme.palette.primary.main, 0.1),
                                                color: theme.palette.primary.main,
                                            }
                                        }}
                                        size="small"
                                        title="Exit Zen Mode"
                                    >
                                        <ExpandIcon />
                                    </IconButton>
                                </Box>
                            )}

                            {/* Editor Container - Portal Target */}
                            <Box sx={{ flex: 1, overflow: 'hidden', bgcolor: 'background.default' }}>
                                {note.content ? (
                                    <div
                                        ref={containerRef}
                                        style={{ width: '100%', height: '100%' }}
                                    />
                                ) : (
                                    <Box sx={{
                                        display: 'flex',
                                        justifyContent: 'center',
                                        alignItems: 'center',
                                        height: '100%',
                                        flexDirection: 'column',
                                        gap: 2
                                    }}>
                                        <Box sx={{
                                            width: 40,
                                            height: 40,
                                            borderRadius: '50%',
                                            border: '3px solid',
                                            borderColor: 'primary.main',
                                            borderTopColor: 'transparent',
                                            animation: 'spin 1s linear infinite',
                                            '@keyframes spin': {
                                                '0%': { transform: 'rotate(0deg)' },
                                                '100%': { transform: 'rotate(360deg)' }
                                            }
                                        }} />
                                        <Typography variant="body2" color="text.secondary">
                                            Decrypting note...
                                        </Typography>
                                    </Box>
                                )}
                            </Box>
                        </Box>
                    </>
                )}
            </AnimatePresence>
        </DialogPortal>
    );
});

NoteFullView.displayName = 'NoteFullView';
