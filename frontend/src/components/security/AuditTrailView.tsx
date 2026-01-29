import { useState, useEffect, useCallback } from 'react';
import {
    Box,
    Paper,
    Typography,
    alpha,
    useTheme,
    useMediaQuery,
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
    Pagination,
    Skeleton,
    type Theme,
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

interface AuditLogRowProps {
    log: AuditLog;
    isMobile: boolean;
    expanded: boolean;
    onToggle: () => void;
    theme: Theme;
    getStatusColor: (status: 'SUCCESS' | 'FAILURE') => string;
}

export function AuditTrailView({ maxHeight = 500 }: AuditTrailViewProps) {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [isLoading, setIsLoading] = useState(true);
    const [expandedRow, setExpandedRow] = useState<string | null>(null);
    const limit = 5;

    const fetchLogs = useCallback(async () => {
        setIsLoading(true);
        try {
            const offset = (page - 1) * limit;
            const response = await auditService.getAuditLogs(limit, offset);
            setLogs(response.logs);
            setTotal(response.total);
            setTotalPages(Math.ceil(response.total / limit));
        } catch (error) {
            console.error('Failed to fetch audit logs:', error);
        } finally {
            setIsLoading(false);
        }
    }, [page, limit]);

    useEffect(() => {
        fetchLogs();
    }, [fetchLogs]);

    const handleRefresh = () => {
        if (page === 1) {
            fetchLogs();
        } else {
            setPage(1);
        }
    };

    const handlePageChange = (_: React.ChangeEvent<unknown>, value: number) => {
        setPage(value);
    };

    const getStatusColor = (status: 'SUCCESS' | 'FAILURE') => {
        return status === 'SUCCESS' ? theme.palette.success.main : theme.palette.error.main;
    };

    const sharedPaperStyles = {
        p: { xs: 2, sm: 3 },
        borderRadius: '16px',
        bgcolor: theme.palette.background.paper,
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
                    <Box component="span">
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
                    </Box>
                </Tooltip>
            </Box>

            {/* Content Section */}
            <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                <TableContainer sx={{ maxHeight }}>
                    <Table stickyHeader size="small">
                        <TableHead>
                            <TableRow>
                                <TableCell sx={{ bgcolor: theme.palette.background.default, borderBottom: `1px solid ${alpha(theme.palette.common.white, 0.1)}`, fontWeight: 700, fontSize: '11px', color: 'text.secondary', letterSpacing: '0.05em', px: { xs: 1, sm: 2 } }}>
                                    ACTION
                                </TableCell>
                                <TableCell sx={{ bgcolor: theme.palette.background.default, borderBottom: `1px solid ${alpha(theme.palette.common.white, 0.1)}`, fontWeight: 700, fontSize: '11px', color: 'text.secondary', letterSpacing: '0.05em', px: { xs: 1, sm: 2 } }}>
                                    STATUS
                                </TableCell>
                                {!isMobile && (
                                    <TableCell sx={{ bgcolor: theme.palette.background.default, borderBottom: `1px solid ${alpha(theme.palette.common.white, 0.1)}`, fontWeight: 700, fontSize: '11px', color: 'text.secondary', letterSpacing: '0.05em', px: 2 }}>
                                        IP ADDRESS
                                    </TableCell>
                                )}
                                <TableCell sx={{ bgcolor: theme.palette.background.default, borderBottom: `1px solid ${alpha(theme.palette.common.white, 0.1)}`, fontWeight: 700, fontSize: '11px', color: 'text.secondary', letterSpacing: '0.05em', px: { xs: 1, sm: 2 } }}>
                                    TIME
                                </TableCell>
                                <TableCell sx={{ bgcolor: theme.palette.background.default, borderBottom: `1px solid ${alpha(theme.palette.common.white, 0.1)}`, width: { xs: 30, sm: 40 }, px: { xs: 0, sm: 2 } }} />
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {/* Header row is already handled in TableHead */}
                        </TableBody>
                        {isLoading ? (
                            <TableBody>
                                {Array.from({ length: 5 }).map((_, i) => (
                                    <TableRow key={`skeleton-${i}`}>
                                        <TableCell sx={{ borderBottom: `1px solid ${alpha(theme.palette.common.white, 0.05)}`, px: { xs: 1, sm: 2 } }}>
                                            <Skeleton width="120px" sx={{ bgcolor: alpha(theme.palette.common.white, 0.05) }} />
                                        </TableCell>
                                        <TableCell sx={{ borderBottom: `1px solid ${alpha(theme.palette.common.white, 0.05)}`, px: { xs: 1, sm: 2 } }}>
                                            <Skeleton width={isMobile ? 24 : 60} sx={{ bgcolor: alpha(theme.palette.common.white, 0.05) }} />
                                        </TableCell>
                                        {!isMobile && (
                                            <TableCell sx={{ borderBottom: `1px solid ${alpha(theme.palette.common.white, 0.05)}`, px: 2 }}>
                                                <Skeleton width="100px" sx={{ bgcolor: alpha(theme.palette.common.white, 0.05) }} />
                                            </TableCell>
                                        )}
                                        <TableCell sx={{ borderBottom: `1px solid ${alpha(theme.palette.common.white, 0.05)}`, px: { xs: 1, sm: 2 } }}>
                                            <Skeleton width="80px" sx={{ bgcolor: alpha(theme.palette.common.white, 0.05) }} />
                                        </TableCell>
                                        <TableCell sx={{ borderBottom: `1px solid ${alpha(theme.palette.common.white, 0.05)}`, px: { xs: 0, sm: 2 } }}>
                                            <Skeleton variant="circular" width={24} height={24} sx={{ bgcolor: alpha(theme.palette.common.white, 0.05) }} />
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        ) : logs.length === 0 ? (
                            <TableBody>
                                <TableRow>
                                    <TableCell colSpan={isMobile ? 4 : 5} sx={{ textAlign: 'center', py: 6, border: 'none' }}>
                                        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                                            No activity recorded yet
                                        </Typography>
                                    </TableCell>
                                </TableRow>
                            </TableBody>
                        ) : (
                            <AnimatePresence mode="popLayout">
                                {logs.map((log, index) => (
                                    <TableBody
                                        key={log._id}
                                        component={motion.tbody}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, scale: 0.95 }}
                                        transition={{ delay: index * 0.03 }}
                                    >
                                        <AuditLogRow
                                            log={log}
                                            isMobile={isMobile}
                                            expanded={expandedRow === log._id}
                                            onToggle={() => setExpandedRow(prev => prev === log._id ? null : log._id)}
                                            theme={theme}
                                            getStatusColor={getStatusColor}
                                        />
                                    </TableBody>
                                ))}
                            </AnimatePresence>
                        )}
                    </Table>
                </TableContainer>

                {/* Pagination */}
                {!isLoading && total > limit && (
                    <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3, pb: 1 }}>
                        <Pagination
                            count={totalPages}
                            page={page}
                            onChange={handlePageChange}
                            size="small"
                            color="primary"
                            sx={{
                                '& .MuiPaginationItem-root': {
                                    fontSize: '11px',
                                    fontWeight: 700,
                                    color: 'text.secondary',
                                    '&.Mui-selected': {
                                        bgcolor: alpha(theme.palette.primary.main, 0.15),
                                        color: theme.palette.primary.main,
                                        '&:hover': {
                                            bgcolor: alpha(theme.palette.primary.main, 0.25),
                                        }
                                    }
                                }
                            }}
                        />
                    </Box>
                )}
            </Box>
        </Paper>
    );
}

// Sub-component for a cleaner main component
function AuditLogRow({ log, isMobile, expanded, onToggle, theme, getStatusColor }: AuditLogRowProps) {
    return (
        <>
            <TableRow
                hover
                onClick={onToggle}
                sx={{
                    cursor: 'pointer',
                    '&:hover': { bgcolor: alpha(theme.palette.common.white, 0.03) }
                }}
            >
                <TableCell sx={{ borderBottom: `1px solid ${alpha(theme.palette.common.white, 0.05)}`, px: { xs: 1, sm: 2 } }}>
                    <Typography variant="body2" sx={{ fontWeight: 600, fontSize: { xs: '12px', sm: '14px' } }}>
                        {auditService.getActionLabel(log.action)}
                    </Typography>
                </TableCell>
                <TableCell sx={{ borderBottom: `1px solid ${alpha(theme.palette.common.white, 0.05)}`, px: { xs: 1, sm: 2 }, whiteSpace: 'nowrap' }}>
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
                                fontSize: '11px',
                                display: { xs: 'none', sm: 'block' }
                            }}
                        >
                            {log.status}
                        </Typography>
                    </Box>
                </TableCell>
                {!isMobile && (
                    <TableCell sx={{ borderBottom: `1px solid ${alpha(theme.palette.common.white, 0.05)}`, px: 2 }}>
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
                <TableCell sx={{ borderBottom: `1px solid ${alpha(theme.palette.common.white, 0.05)}`, px: { xs: 1, sm: 2 }, whiteSpace: 'nowrap' }}>
                    <Tooltip title={new Date(log.timestamp).toLocaleString()}>
                        <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '11px' }}>
                            {auditService.formatTimestamp(log.timestamp)}
                        </Typography>
                    </Tooltip>
                </TableCell>
                <TableCell sx={{ borderBottom: `1px solid ${alpha(theme.palette.common.white, 0.05)}`, px: { xs: 0, sm: 2 }, width: { xs: 30, sm: 40 } }}>
                    <IconButton size="small" sx={{ color: 'text.secondary' }}>
                        {expanded ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
                    </IconButton>
                </TableCell>
            </TableRow>

            {/* Expanded Details Row */}
            <TableRow>
                <TableCell colSpan={isMobile ? 4 : 5} sx={{ py: 0, borderBottom: expanded ? `1px solid ${alpha(theme.palette.common.white, 0.05)}` : 'none' }}>
                    <Collapse in={expanded} timeout="auto" unmountOnExit>
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
    );
}

export default AuditTrailView;
