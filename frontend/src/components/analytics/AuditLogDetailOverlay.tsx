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
} from '@mui/material';
import {
    Close as CloseIcon,
    InfoOutlined as InfoIcon,
    Terminal as TerminalIcon,
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import { DialogPortal } from '../social/DialogPortal';
import type { AuditLogEntry } from '@/services/analyticsService';
import auditService, { type AuditAction } from '@/services/auditService';

interface AuditLogDetailOverlayProps {
    open: boolean;
    onClose: () => void;
    log: AuditLogEntry | null;
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

export const AuditLogDetailOverlay = memo(({
    open,
    onClose,
    log,
}: AuditLogDetailOverlayProps) => {
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

    const metadata = (log.metadata as Record<string, any>) || {};

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
                                                    bgcolor: alpha(theme.palette.primary.main, 0.1),
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    color: theme.palette.primary.main
                                                }}
                                            >
                                                <InfoIcon />
                                            </Box>
                                            <Box>
                                                <Typography variant="h6" sx={{ fontWeight: 800, lineHeight: 1.2 }}>
                                                    Event Details
                                                </Typography>
                                                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                                                    {auditService.getActionLabel(log.action as AuditAction)}
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
                                                <DetailItem label="Timestamp" value={auditService.formatTimestamp(log.timestamp)} />
                                                <DetailItem label="Status" value={
                                                    <Box
                                                        sx={{
                                                            px: 1,
                                                            py: 0.5,
                                                            borderRadius: '6px',
                                                            bgcolor: log.status === 'SUCCESS' ? alpha(theme.palette.success.main, 0.1) : alpha(theme.palette.error.main, 0.1),
                                                            color: log.status === 'SUCCESS' ? theme.palette.success.main : theme.palette.error.main,
                                                            fontWeight: 700,
                                                            fontSize: '0.7rem',
                                                            display: 'inline-flex',
                                                            alignItems: 'center',
                                                            lineHeight: 1,
                                                        }}
                                                    >
                                                        {log.status}
                                                    </Box>
                                                } />
                                                <DetailItem label="User ID" value={log.userId || 'Anonymous'} mono />
                                            </Grid>
                                            <Grid size={{ xs: 12, sm: 6 }}>
                                                <DetailItem label="IP Address" value={auditService.maskIpAddress(log.ipAddress)} mono />
                                                {/* Add more common fields if available in AuditLogEntry */}
                                            </Grid>
                                        </Grid>

                                        <Box sx={{ mt: 2 }}>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
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

AuditLogDetailOverlay.displayName = 'AuditLogDetailOverlay';
