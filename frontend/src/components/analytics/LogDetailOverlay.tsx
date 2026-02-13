import { memo, useEffect } from 'react';
import {
    Box,
    Typography,
    IconButton,
    alpha,
    useTheme,
    Paper,
    Divider,
    Grid,
    Chip,
} from '@mui/material';
import {
    Close as CloseIcon,
    InfoOutlined as InfoIcon,
    Terminal as TerminalIcon,
    Warning as WarningIcon,
    Error as ErrorIcon,
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import { DialogPortal } from '../social/DialogPortal';
import type { LogEntry } from '@/services/analyticsService';

interface LogDetailOverlayProps {
    open: boolean;
    onClose: () => void;
    log: LogEntry | null;
}

const DetailItem = ({ label, value, mono = false }: { label: string; value: string | React.ReactNode; mono?: boolean }) => {
    const theme = useTheme();
    return (
        <Box sx={{ mb: 2 }}>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, mb: 0.5, display: 'block' }}>
                {label}
            </Typography>
            <Typography
                variant="body2"
                sx={{
                    fontFamily: mono ? 'JetBrains Mono, monospace' : 'inherit',
                    color: theme.palette.text.primary,
                    fontWeight: 500,
                    wordBreak: 'break-all'
                }}
            >
                {value}
            </Typography>
        </Box>
    );
};

export const LogDetailOverlay = memo(({
    open,
    onClose,
    log,
}: LogDetailOverlayProps) => {
    const theme = useTheme();

    // Close on Escape key
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && open) {
                onClose();
            }
        };

        if (open) {
            window.addEventListener('keydown', handleKeyDown);
        }

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [open, onClose]);

    if (!log) return null;

    const metadata = log.metadata || {};

    const getLevelIcon = (level: string) => {
        switch (level) {
            case 'INFO': return <InfoIcon />;
            case 'WARN': return <WarningIcon />;
            case 'ERROR': return <ErrorIcon />;
            default: return <InfoIcon />;
        }
    };

    const getLevelColor = (level: string) => {
        switch (level) {
            case 'INFO': return theme.palette.info.main;
            case 'WARN': return theme.palette.warning.main;
            case 'ERROR': return theme.palette.error.main;
            default: return theme.palette.info.main;
        }
    };

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
                                zIndex: 9998,
                                bgcolor: alpha(theme.palette.common.black, 0.7),
                                backdropFilter: 'blur(8px)',
                            }}
                        />

                        {/* Content Container Wrapper */}
                        <Box
                            sx={{
                                position: 'fixed',
                                inset: 0,
                                zIndex: 9999,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                pointerEvents: 'none',
                                p: { xs: 1, sm: 2, md: 3 },
                            }}
                        >
                            <Box
                                component={motion.div}
                                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                                transition={{ duration: 0.2, ease: 'easeOut' }}
                                sx={{
                                    width: { xs: '100%', sm: '600px', md: '800px' },
                                    maxHeight: '90vh',
                                    outline: 'none',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    pointerEvents: 'auto',
                                }}
                            >
                                <Paper
                                    variant="glass"
                                    sx={{
                                        borderRadius: '24px',
                                        overflow: 'hidden',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                                        bgcolor: alpha(theme.palette.background.default, 0.9),
                                        backdropFilter: 'blur(20px)',
                                        boxShadow: '0 32px 64px -12px rgba(0, 0, 0, 0.5)',
                                    }}
                                >
                                    {/* Header */}
                                    <Box sx={{ p: 3, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                            <Box
                                                sx={{
                                                    width: 40,
                                                    height: 40,
                                                    borderRadius: '12px',
                                                    bgcolor: alpha(getLevelColor(log.level), 0.1),
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    color: getLevelColor(log.level)
                                                }}
                                            >
                                                {getLevelIcon(log.level)}
                                            </Box>
                                            <Box>
                                                <Typography variant="h6" sx={{ fontWeight: 800, lineHeight: 1.2 }}>
                                                    Log Details
                                                </Typography>
                                                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                                                    {log.source}
                                                </Typography>
                                            </Box>
                                        </Box>
                                        <IconButton onClick={onClose} sx={{ bgcolor: alpha(theme.palette.text.primary, 0.05), '&:hover': { bgcolor: alpha(theme.palette.text.primary, 0.1) } }}>
                                            <CloseIcon />
                                        </IconButton>
                                    </Box>

                                    <Divider sx={{ borderColor: alpha(theme.palette.divider, 0.05) }} />

                                    {/* Body */}
                                    <Box sx={{ p: 3, overflowY: 'auto' }}>
                                        <Grid container spacing={4}>
                                            <Grid size={{ xs: 12, sm: 6 }}>
                                                <DetailItem label="Timestamp" value={new Date(log.timestamp).toLocaleString()} />
                                                <DetailItem label="Level" value={
                                                    <Chip
                                                        label={log.level}
                                                        size="small"
                                                        sx={{
                                                            bgcolor: alpha(getLevelColor(log.level), 0.1),
                                                            color: getLevelColor(log.level),
                                                            fontWeight: 700,
                                                            fontSize: '0.7rem',
                                                        }}
                                                    />
                                                } />
                                                <DetailItem label="Source" value={log.source} mono />
                                            </Grid>
                                            <Grid size={{ xs: 12, sm: 6 }}>
                                                <DetailItem label="User ID" value={log.userId || 'N/A'} mono />
                                                <DetailItem label="Request ID" value={log.requestId || 'N/A'} mono />
                                            </Grid>
                                            <Grid size={{ xs: 12 }}>
                                                <DetailItem label="Message" value={log.message} />
                                            </Grid>
                                        </Grid>

                                        {log.stackTrace && (
                                            <Box sx={{ mt: 2 }}>
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                                                    <Typography variant="subtitle2" sx={{ fontWeight: 700, color: theme.palette.error.main }}>
                                                        STACK TRACE
                                                    </Typography>
                                                </Box>
                                                <Paper
                                                    sx={{
                                                        p: 2,
                                                        bgcolor: alpha(theme.palette.common.black, 0.2),
                                                        borderRadius: '16px',
                                                        border: `1px solid ${alpha(theme.palette.divider, 0.05)}`,
                                                        fontFamily: 'JetBrains Mono, monospace',
                                                        fontSize: '0.8rem',
                                                        color: alpha(theme.palette.error.light, 0.9),
                                                        maxHeight: '200px',
                                                        overflowY: 'auto'
                                                    }}
                                                >
                                                    <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                                                        {log.stackTrace}
                                                    </pre>
                                                </Paper>
                                            </Box>
                                        )}

                                        <Box sx={{ mt: 2 }}>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                                                <TerminalIcon sx={{ fontSize: '1.2rem', color: theme.palette.text.secondary }} />
                                                <Typography variant="subtitle2" sx={{ fontWeight: 700, color: theme.palette.text.secondary }}>
                                                    METADATA
                                                </Typography>
                                            </Box>
                                            <Paper
                                                sx={{
                                                    p: 2,
                                                    bgcolor: alpha(theme.palette.common.black, 0.2),
                                                    borderRadius: '16px',
                                                    border: `1px solid ${alpha(theme.palette.divider, 0.05)}`,
                                                    fontFamily: 'JetBrains Mono, monospace',
                                                    fontSize: '0.85rem',
                                                    color: alpha(theme.palette.text.primary, 0.9),
                                                    maxHeight: '300px',
                                                    overflowY: 'auto'
                                                }}
                                            >
                                                <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                                                    {JSON.stringify(metadata, null, 2)}
                                                </pre>
                                            </Paper>
                                        </Box>
                                    </Box>

                                    {/* Footer */}
                                    <Box sx={{ p: 2, display: 'flex', justifyContent: 'flex-end', bgcolor: alpha(theme.palette.text.primary, 0.02) }}>
                                        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                                            Log ID: {log._id}
                                        </Typography>
                                    </Box>
                                </Paper>
                            </Box>
                        </Box>
                    </>
                )}
            </AnimatePresence>
        </DialogPortal>
    );
});

LogDetailOverlay.displayName = 'LogDetailOverlay';
