import { useState, useCallback, useEffect } from 'react';
import {
    Box,
    Typography,
    useTheme,
    alpha,
    Grid,
    IconButton,
    Chip,
    Tooltip,
    Paper,
    useMediaQuery,
    Stack,
    Portal,
} from '@mui/material';
import { motion, AnimatePresence } from 'framer-motion';
import {
    AlertTriangle,
    AlertCircle,
    X,
    Link,
    Clock,
    Server,
    User,
    Hash,
    FileText,
    Copy,
    Check,
} from 'lucide-react';
import type { SystemLog } from '@/services/adminService';
import dayjs from 'dayjs';

const OVERLAY_Z_INDEX = 1400;

interface LogDetailOverlayProps {
    log: SystemLog | null;
    open: boolean;
    onClose: () => void;
}

export function LogDetailOverlay({ log, open, onClose }: LogDetailOverlayProps) {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
    const [copiedField, setCopiedField] = useState<string | null>(null);

    // Close on Escape key
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && open) {
                onClose();
            }
        };
        if (open) {
            window.addEventListener('keydown', handleKeyDown);
            document.body.style.overflow = 'hidden';
        }
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            document.body.style.overflow = '';
        };
    }, [open, onClose]);

    const handleCopy = useCallback(async (text: string, field: string) => {
        await navigator.clipboard.writeText(text);
        setCopiedField(field);
        setTimeout(() => setCopiedField(null), 2000);
    }, []);

    const levelColor = log?.level === 'error' ? theme.palette.error.main : theme.palette.warning.main;
    const statusColor = log?.statusCode 
        ? log.statusCode >= 500 
            ? theme.palette.error.main 
            : log.statusCode >= 400 
                ? theme.palette.warning.main 
                : theme.palette.success.main
        : theme.palette.text.secondary;

    const DetailSection = ({ icon: Icon, label, value, mono = false, copyable = false }: { 
        icon: React.ElementType; 
        label: string; 
        value: string | number | undefined | null;
        mono?: boolean;
        copyable?: boolean;
    }) => {
        if (!value) return null;
        const stringValue = String(value);
        return (
            <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
                <Box
                    sx={{
                        width: 36,
                        height: 36,
                        borderRadius: '10px',
                        bgcolor: alpha(theme.palette.primary.main, 0.1),
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                    }}
                >
                    <Icon size={16} color={theme.palette.primary.main} />
                </Box>
                <Box sx={{ minWidth: 0, flex: 1 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, textTransform: 'uppercase', fontSize: '10px', letterSpacing: 0.5 }}>
                        {label}
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography
                            variant="body2"
                            sx={{
                                fontFamily: mono ? 'monospace' : 'inherit',
                                wordBreak: 'break-word',
                                flex: 1,
                            }}
                        >
                            {stringValue}
                        </Typography>
                        {copyable && (
                            <Tooltip title={copiedField === label ? 'Copied!' : 'Copy'}>
                                <IconButton size="small" onClick={() => handleCopy(stringValue, label)} sx={{ flexShrink: 0 }}>
                                    {copiedField === label ? <Check size={14} /> : <Copy size={14} />}
                                </IconButton>
                            </Tooltip>
                        )}
                    </Box>
                </Box>
            </Box>
        );
    };

    const CodeBlock = ({ title, content, color }: { title: string; content: string; color?: string }) => (
        <Box>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, textTransform: 'uppercase', fontSize: '10px', letterSpacing: 0.5, mb: 1, display: 'block' }}>
                {title}
            </Typography>
            <Paper
                sx={{
                    p: 2,
                    bgcolor: alpha(color || theme.palette.background.default, 0.1),
                    borderRadius: 2,
                    fontFamily: 'monospace',
                    fontSize: { xs: '11px', sm: '12px' },
                    overflow: 'auto',
                    maxHeight: { xs: 200, sm: 300 },
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                    border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                    position: 'relative',
                }}
            >
                <IconButton
                    size="small"
                    onClick={() => handleCopy(content, title)}
                    sx={{ position: 'absolute', top: 8, right: 8, bgcolor: alpha(theme.palette.background.paper, 0.8) }}
                >
                    {copiedField === title ? <Check size={14} /> : <Copy size={14} />}
                </IconButton>
                {content}
            </Paper>
        </Box>
    );

    return (
        <Portal>
            <AnimatePresence>
                {open && log && (
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
                                zIndex: OVERLAY_Z_INDEX - 1,
                                bgcolor: alpha(theme.palette.common.black, 0.7),
                                backdropFilter: 'blur(10px)',
                            }}
                        />

                        {/* Fullscreen Content */}
                        <Box
                            component={motion.div}
                            initial={isMobile ? { opacity: 0, y: 40 } : { opacity: 0, scale: 0.98 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={isMobile ? { opacity: 0, y: 40 } : { opacity: 0, scale: 0.98 }}
                            transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
                            sx={{
                                position: 'fixed',
                                inset: isMobile ? 0 : { xs: 10, sm: 20, md: 40 },
                                zIndex: OVERLAY_Z_INDEX,
                                bgcolor: alpha(theme.palette.background.default, 0.97),
                                borderRadius: isMobile ? 0 : '24px',
                                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
                                border: isMobile ? 'none' : `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                                display: 'flex',
                                flexDirection: 'column',
                                overflow: 'hidden',
                                backdropFilter: 'blur(20px)',
                            }}
                        >
                            {/* Header */}
                            <Box
                                sx={{
                                    p: { xs: 2, sm: 3 },
                                    borderBottom: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 2,
                                    flexShrink: 0,
                                }}
                            >
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <IconButton onClick={onClose} aria-label="Close detail view">
                                        <X size={20} />
                                    </IconButton>
                                    {!isMobile && (
                                        <Typography
                                            variant="caption"
                                            sx={{
                                                bgcolor: alpha(theme.palette.text.primary, 0.1),
                                                px: 0.8,
                                                py: 0.2,
                                                borderRadius: '4px',
                                                fontSize: '0.65rem',
                                                fontWeight: 700,
                                                color: theme.palette.text.secondary,
                                                border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                                            }}
                                        >
                                            ESC
                                        </Typography>
                                    )}
                                </Box>

                                <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', gap: 2 }}>
                                    <Box
                                        sx={{
                                            width: { xs: 40, sm: 48 },
                                            height: { xs: 40, sm: 48 },
                                            borderRadius: '12px',
                                            bgcolor: alpha(levelColor, 0.1),
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                        }}
                                    >
                                        {log.level === 'error' ? (
                                            <AlertCircle size={isMobile ? 20 : 24} color={levelColor} />
                                        ) : (
                                            <AlertTriangle size={isMobile ? 20 : 24} color={levelColor} />
                                        )}
                                    </Box>
                                    <Box sx={{ minWidth: 0, flex: 1 }}>
                                        <Typography variant={isMobile ? 'subtitle1' : 'h6'} sx={{ fontWeight: 700 }}>
                                            Log Detail
                                        </Typography>
                                        <Typography variant="caption" color="text.secondary">
                                            {dayjs(log.timestamp).format('MMMM D, YYYY • HH:mm:ss')}
                                        </Typography>
                                    </Box>
                                </Box>

                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <Chip
                                        label={log.level.toUpperCase()}
                                        size="small"
                                        sx={{
                                            bgcolor: alpha(levelColor, 0.15),
                                            color: levelColor,
                                            fontWeight: 700,
                                            fontSize: '11px',
                                        }}
                                    />
                                    {log.statusCode && (
                                        <Chip
                                            label={log.statusCode}
                                            size="small"
                                            sx={{
                                                bgcolor: alpha(statusColor, 0.15),
                                                color: statusColor,
                                                fontWeight: 600,
                                                fontSize: '11px',
                                            }}
                                        />
                                    )}
                                </Box>
                            </Box>

                            {/* Scrollable Content */}
                            <Box sx={{ flex: 1, overflow: 'auto', p: { xs: 2, sm: 3 } }}>
                                <Grid container spacing={3}>
                                    {/* Message */}
                                    <Grid size={12}>
                                        <Paper
                                            sx={{
                                                p: { xs: 2, sm: 3 },
                                                bgcolor: alpha(levelColor, 0.05),
                                                borderRadius: 3,
                                                border: `1px solid ${alpha(levelColor, 0.2)}`,
                                            }}
                                        >
                                            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, textTransform: 'uppercase', fontSize: '10px', letterSpacing: 0.5, mb: 1, display: 'block' }}>
                                                Message
                                            </Typography>
                                            <Typography variant="body1" sx={{ fontWeight: 500, lineHeight: 1.6 }}>
                                                {log.message}
                                            </Typography>
                                        </Paper>
                                    </Grid>

                                    {/* Request Details */}
                                    <Grid size={{ xs: 12, md: 6 }}>
                                        <Paper
                                            sx={{
                                                p: { xs: 2, sm: 3 },
                                                bgcolor: alpha(theme.palette.background.paper, 0.5),
                                                borderRadius: 3,
                                                border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                                                height: '100%',
                                            }}
                                        >
                                            <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 2.5 }}>
                                                Request Details
                                            </Typography>
                                            <Stack spacing={2.5}>
                                                <DetailSection icon={Link} label="URL" value={log.url} mono copyable />
                                                <DetailSection icon={Hash} label="Method" value={log.method} />
                                                <DetailSection icon={Server} label="Status Code" value={log.statusCode} />
                                                <DetailSection icon={Clock} label="Timestamp" value={dayjs(log.timestamp).format('YYYY-MM-DD HH:mm:ss.SSS')} mono />
                                            </Stack>
                                        </Paper>
                                    </Grid>

                                    {/* Context Details */}
                                    <Grid size={{ xs: 12, md: 6 }}>
                                        <Paper
                                            sx={{
                                                p: { xs: 2, sm: 3 },
                                                bgcolor: alpha(theme.palette.background.paper, 0.5),
                                                borderRadius: 3,
                                                border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                                                height: '100%',
                                            }}
                                        >
                                            <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 2.5 }}>
                                                Context
                                            </Typography>
                                            <Stack spacing={2.5}>
                                                <DetailSection icon={FileText} label="Log ID" value={log._id} mono copyable />
                                                <DetailSection icon={User} label="User ID" value={log.userId} mono copyable />
                                                <DetailSection icon={Server} label="Service" value={log.service} />
                                            </Stack>
                                        </Paper>
                                    </Grid>

                                    {/* Error Details */}
                                    {log.error && (
                                        <Grid size={12}>
                                            <CodeBlock title="Error" content={log.error} color={theme.palette.error.main} />
                                        </Grid>
                                    )}

                                    {/* Stack Trace */}
                                    {log.stack && (
                                        <Grid size={12}>
                                            <CodeBlock title="Stack Trace" content={log.stack} />
                                        </Grid>
                                    )}

                                    {/* Metadata */}
                                    {log.metadata && Object.keys(log.metadata).length > 0 && (
                                        <Grid size={12}>
                                            <CodeBlock title="Metadata" content={JSON.stringify(log.metadata, null, 2)} color={theme.palette.info.main} />
                                        </Grid>
                                    )}
                                </Grid>
                            </Box>
                        </Box>
                    </>
                )}
            </AnimatePresence>
        </Portal>
    );
}
