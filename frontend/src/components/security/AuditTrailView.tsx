import { useState, useEffect, useCallback } from 'react';
import {
    Box,
    Paper,
    Typography,
    alpha,
    useTheme,
    useMediaQuery,
    CircularProgress,
    Button,
    IconButton,
    Tooltip,
    Collapse,
    Chip,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
} from '@mui/material';
import {
    History as HistoryIcon,
    Refresh as RefreshIcon,
    ExpandMore as ExpandMoreIcon,
    ExpandLess as ExpandLessIcon,
    CheckCircle as SuccessIcon,
    Cancel as FailureIcon,
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import auditService, { type AuditLog } from '@/services/auditService';

interface AuditTrailViewProps {
    maxHeight?: string | number;
}

export function AuditTrailView({ maxHeight = 500 }: AuditTrailViewProps) {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [total, setTotal] = useState(0);
    const [hasMore, setHasMore] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [expandedRow, setExpandedRow] = useState<string | null>(null);
    const [offset, setOffset] = useState(0);
    const limit = 20;

    const fetchLogs = useCallback(async (reset = false) => {
        const currentOffset = reset ? 0 : offset;

        if (reset) {
            setIsLoading(true);
        } else {
            setIsLoadingMore(true);
        }

        try {
            const response = await auditService.getAuditLogs(limit, currentOffset);

            if (reset) {
                setLogs(response.logs);
            } else {
                setLogs(prev => [...prev, ...response.logs]);
            }

            setTotal(response.total);
            setHasMore(response.hasMore);
            setOffset(currentOffset + response.logs.length);
        } catch (error) {
            console.error('Failed to fetch audit logs:', error);
        } finally {
            setIsLoading(false);
            setIsLoadingMore(false);
        }
    }, [offset]);

    useEffect(() => {
        fetchLogs(true);
    }, []);

    const handleRefresh = () => {
        setOffset(0);
        fetchLogs(true);
    };

    const handleLoadMore = () => {
        fetchLogs(false);
    };

    const toggleRowExpand = (logId: string) => {
        setExpandedRow(prev => prev === logId ? null : logId);
    };

    const getStatusColor = (status: 'SUCCESS' | 'FAILURE') => {
        return status === 'SUCCESS' ? theme.palette.success.main : theme.palette.error.main;
    };

    const sharedPaperStyles = {
        p: 3,
        borderRadius: '16px',
        bgcolor: alpha(theme.palette.background.paper, 0.4),
        backdropFilter: 'blur(12px)',
        border: `1px solid ${alpha(theme.palette.common.white, 0.05)}`,
        boxShadow: '0 4px 24px -1px rgba(0, 0, 0, 0.2)',
    };

    return (
        <Paper sx={sharedPaperStyles}>
            {/* Header */}
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <HistoryIcon sx={{ fontSize: 20, color: theme.palette.primary.main }} />
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'text.secondary', letterSpacing: '0.1em', fontSize: '10px' }}>
                        ACTIVITY LOG
                    </Typography>
                    <Chip
                        label={`${total} events`}
                        size="small"
                        sx={{
                            height: 20,
                            fontSize: '10px',
                            fontWeight: 600,
                            bgcolor: alpha(theme.palette.primary.main, 0.1),
                            color: theme.palette.primary.main,
                        }}
                    />
                </Box>
                <Tooltip title="Refresh">
                    <IconButton
                        onClick={handleRefresh}
                        disabled={isLoading}
                        sx={{
                            color: 'text.secondary',
                            '&:hover': { color: theme.palette.primary.main }
                        }}
                    >
                        <RefreshIcon sx={{ fontSize: 18 }} />
                    </IconButton>
                </Tooltip>
            </Box>

            {/* Loading State */}
            {isLoading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
                    <CircularProgress size={32} />
                </Box>
            ) : logs.length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 6 }}>
                    <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                        No activity recorded yet
                    </Typography>
                </Box>
            ) : (
                <>
                    {/* Table */}
                    <TableContainer sx={{ maxHeight }}>
                        <Table stickyHeader size="small">
                            <TableHead>
                                <TableRow>
                                    <TableCell sx={{ bgcolor: theme.palette.background.paper, borderBottom: `1px solid ${alpha(theme.palette.common.white, 0.1)}`, fontWeight: 700, fontSize: '11px', color: 'text.secondary', letterSpacing: '0.05em' }}>
                                        ACTION
                                    </TableCell>
                                    <TableCell sx={{ bgcolor: theme.palette.background.paper, borderBottom: `1px solid ${alpha(theme.palette.common.white, 0.1)}`, fontWeight: 700, fontSize: '11px', color: 'text.secondary', letterSpacing: '0.05em' }}>
                                        STATUS
                                    </TableCell>
                                    {!isMobile && (
                                        <TableCell sx={{ bgcolor: theme.palette.background.paper, borderBottom: `1px solid ${alpha(theme.palette.common.white, 0.1)}`, fontWeight: 700, fontSize: '11px', color: 'text.secondary', letterSpacing: '0.05em' }}>
                                            IP ADDRESS
                                        </TableCell>
                                    )}
                                    <TableCell sx={{ bgcolor: theme.palette.background.paper, borderBottom: `1px solid ${alpha(theme.palette.common.white, 0.1)}`, fontWeight: 700, fontSize: '11px', color: 'text.secondary', letterSpacing: '0.05em' }}>
                                        TIME
                                    </TableCell>
                                    <TableCell sx={{ bgcolor: theme.palette.background.paper, borderBottom: `1px solid ${alpha(theme.palette.common.white, 0.1)}`, width: 40 }} />
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                <AnimatePresence>
                                    {logs.map((log, index) => (
                                        <motion.tr
                                            key={log._id}
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: index * 0.03 }}
                                            style={{ display: 'contents' }}
                                        >
                                            <>
                                                <TableRow
                                                    hover
                                                    onClick={() => toggleRowExpand(log._id)}
                                                    sx={{
                                                        cursor: 'pointer',
                                                        '&:hover': { bgcolor: alpha(theme.palette.common.white, 0.03) }
                                                    }}
                                                >
                                                    <TableCell sx={{ borderBottom: `1px solid ${alpha(theme.palette.common.white, 0.05)}` }}>
                                                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                                            {auditService.getActionLabel(log.action)}
                                                        </Typography>
                                                    </TableCell>
                                                    <TableCell sx={{ borderBottom: `1px solid ${alpha(theme.palette.common.white, 0.05)}` }}>
                                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                                            {log.status === 'SUCCESS' ? (
                                                                <SuccessIcon sx={{ fontSize: 14, color: getStatusColor(log.status) }} />
                                                            ) : (
                                                                <FailureIcon sx={{ fontSize: 14, color: getStatusColor(log.status) }} />
                                                            )}
                                                            <Typography
                                                                variant="caption"
                                                                sx={{
                                                                    fontWeight: 600,
                                                                    color: getStatusColor(log.status),
                                                                    fontSize: '11px'
                                                                }}
                                                            >
                                                                {log.status}
                                                            </Typography>
                                                        </Box>
                                                    </TableCell>
                                                    {!isMobile && (
                                                        <TableCell sx={{ borderBottom: `1px solid ${alpha(theme.palette.common.white, 0.05)}` }}>
                                                            <Tooltip title={log.ipAddress}>
                                                                <Typography
                                                                    variant="caption"
                                                                    sx={{
                                                                        fontFamily: '"JetBrains Mono", monospace',
                                                                        fontSize: '11px',
                                                                        color: 'text.secondary',
                                                                    }}
                                                                >
                                                                    {auditService.maskIpAddress(log.ipAddress)}
                                                                </Typography>
                                                            </Tooltip>
                                                        </TableCell>
                                                    )}
                                                    <TableCell sx={{ borderBottom: `1px solid ${alpha(theme.palette.common.white, 0.05)}` }}>
                                                        <Tooltip title={new Date(log.timestamp).toLocaleString()}>
                                                            <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '11px' }}>
                                                                {auditService.formatTimestamp(log.timestamp)}
                                                            </Typography>
                                                        </Tooltip>
                                                    </TableCell>
                                                    <TableCell sx={{ borderBottom: `1px solid ${alpha(theme.palette.common.white, 0.05)}` }}>
                                                        <IconButton size="small" sx={{ color: 'text.secondary' }}>
                                                            {expandedRow === log._id ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
                                                        </IconButton>
                                                    </TableCell>
                                                </TableRow>

                                                {/* Expanded Details Row */}
                                                <TableRow>
                                                    <TableCell colSpan={isMobile ? 4 : 5} sx={{ py: 0, borderBottom: expandedRow === log._id ? `1px solid ${alpha(theme.palette.common.white, 0.05)}` : 'none' }}>
                                                        <Collapse in={expandedRow === log._id} timeout="auto" unmountOnExit>
                                                            <Box sx={{ py: 2, px: 1 }}>
                                                                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
                                                                    <Box>
                                                                        <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, fontSize: '10px', letterSpacing: '0.05em' }}>
                                                                            RECORD HASH
                                                                        </Typography>
                                                                        <Typography
                                                                            variant="caption"
                                                                            sx={{
                                                                                display: 'block',
                                                                                fontFamily: '"JetBrains Mono", monospace',
                                                                                fontSize: '10px',
                                                                                color: 'text.primary',
                                                                                mt: 0.5,
                                                                            }}
                                                                        >
                                                                            {log.recordHash.slice(0, 32)}...
                                                                        </Typography>
                                                                    </Box>
                                                                    <Box>
                                                                        <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, fontSize: '10px', letterSpacing: '0.05em' }}>
                                                                            FULL TIMESTAMP
                                                                        </Typography>
                                                                        <Typography
                                                                            variant="caption"
                                                                            sx={{
                                                                                display: 'block',
                                                                                fontSize: '11px',
                                                                                color: 'text.primary',
                                                                                mt: 0.5,
                                                                            }}
                                                                        >
                                                                            {new Date(log.timestamp).toLocaleString()}
                                                                        </Typography>
                                                                    </Box>
                                                                    {Object.keys(log.metadata).length > 0 && (
                                                                        <Box>
                                                                            <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, fontSize: '10px', letterSpacing: '0.05em' }}>
                                                                                METADATA
                                                                            </Typography>
                                                                            <Typography
                                                                                component="pre"
                                                                                sx={{
                                                                                    fontFamily: '"JetBrains Mono", monospace',
                                                                                    fontSize: '10px',
                                                                                    color: 'text.primary',
                                                                                    mt: 0.5,
                                                                                    m: 0,
                                                                                    whiteSpace: 'pre-wrap',
                                                                                }}
                                                                            >
                                                                                {JSON.stringify(log.metadata, null, 2)}
                                                                            </Typography>
                                                                        </Box>
                                                                    )}
                                                                </Box>
                                                            </Box>
                                                        </Collapse>
                                                    </TableCell>
                                                </TableRow>
                                            </>
                                        </motion.tr>
                                    ))}
                                </AnimatePresence>
                            </TableBody>
                        </Table>
                    </TableContainer>

                    {/* Load More */}
                    {hasMore && (
                        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
                            <Button
                                variant="text"
                                onClick={handleLoadMore}
                                disabled={isLoadingMore}
                                sx={{
                                    textTransform: 'none',
                                    fontWeight: 600,
                                    color: theme.palette.primary.main,
                                }}
                            >
                                {isLoadingMore ? <CircularProgress size={16} sx={{ mr: 1 }} /> : null}
                                Load More ({total - logs.length} remaining)
                            </Button>
                        </Box>
                    )}
                </>
            )
            }
        </Paper >
    );
}

export default AuditTrailView;
