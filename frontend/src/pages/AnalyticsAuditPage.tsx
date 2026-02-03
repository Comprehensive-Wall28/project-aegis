import { useState, useEffect, useCallback } from 'react';
import {
    Box,
    Paper,
    Typography,
    alpha,
    useTheme,
    MenuItem,
    TextField,
} from '@mui/material';
import { DataGrid, type GridColDef, type GridPaginationModel } from '@mui/x-data-grid';
import {
    CheckCircle as CheckCircleIcon,
    Error as ErrorIcon,
} from '@mui/icons-material';
import { getAuditLogs, type AuditLogEntry } from '@/services/analyticsService';
import auditService, { type AuditAction, type AuditStatus } from '@/services/auditService';
import { usePasswordGate } from '@/hooks/usePasswordGate';
import { PasswordGateDialog } from '@/components/analytics/PasswordGateDialog';
import { DebouncedSearchInput } from '@/components/common/DebouncedSearchInput';

export default function AnalyticsAuditPage() {
    const theme = useTheme();
    const { isAuthenticated, password, onAccessGranted } = usePasswordGate();
    const [logs, setLogs] = useState<AuditLogEntry[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [rowCount, setRowCount] = useState(0);

    // Filters and pagination state
    const [searchQuery, setSearchQuery] = useState('');
    const [status, setStatus] = useState<AuditStatus | ''>('');
    const [paginationModel, setPaginationModel] = useState<GridPaginationModel>({
        page: 0,
        pageSize: 25,
    });

    const fetchLogs = useCallback(async () => {
        if (!password) return;

        setIsLoading(true);
        try {
            const response = await getAuditLogs(password, {
                search: searchQuery || undefined,
                status: status || undefined,
                page: paginationModel.page + 1,
                limit: paginationModel.pageSize,
            });

            if (response.success) {
                setLogs(response.data);
                setRowCount(response.pagination.total);
            }
        } catch (error) {
            console.error('Failed to fetch audit logs:', error);
        } finally {
            setIsLoading(false);
        }
    }, [password, searchQuery, status, paginationModel]);

    useEffect(() => {
        if (isAuthenticated && password) {
            fetchLogs();
        }
    }, [isAuthenticated, password, fetchLogs]);

    const columns: GridColDef<AuditLogEntry>[] = [
        {
            field: 'timestamp',
            headerName: 'Timestamp',
            width: 180,
            valueFormatter: (value) => auditService.formatTimestamp(value as string),
        },
        {
            field: 'action',
            headerName: 'Action',
            width: 200,
            renderCell: (params) => (
                <Typography variant="caption" sx={{ fontWeight: 600, color: theme.palette.text.primary }}>
                    {auditService.getActionLabel(params.value as AuditAction)}
                </Typography>
            ),
        },
        {
            field: 'status',
            headerName: 'Status',
            width: 120,
            renderCell: (params) => {
                const isSuccess = params.value === 'SUCCESS';
                return (
                    <Box
                        sx={{
                            px: 1,
                            py: 0.5,
                            borderRadius: '6px',
                            bgcolor: isSuccess
                                ? alpha(theme.palette.success.main, 0.1)
                                : alpha(theme.palette.error.main, 0.1),
                            color: isSuccess
                                ? theme.palette.success.main
                                : theme.palette.error.main,
                            fontWeight: 700,
                            fontSize: '0.65rem',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 0.5,
                            lineHeight: 1,
                        }}
                    >
                        {isSuccess ? <CheckCircleIcon sx={{ fontSize: '0.9rem' }} /> : <ErrorIcon sx={{ fontSize: '0.9rem' }} />}
                        {params.value}
                    </Box>
                );
            },
        },
        {
            field: 'userId',
            headerName: 'User ID',
            width: 200,
            renderCell: (params) => (
                <Typography
                    variant="caption"
                    sx={{
                        fontFamily: 'JetBrains Mono, monospace',
                        fontSize: '0.75rem',
                        color: theme.palette.text.secondary,
                    }}
                >
                    {params.value || 'Anonymous'}
                </Typography>
            ),
        },
        {
            field: 'ipAddress',
            headerName: 'IP Address',
            width: 130,
            renderCell: (params) => (
                <Typography variant="caption" sx={{ color: theme.palette.text.secondary, fontSize: '0.7rem' }}>
                    {auditService.maskIpAddress(params.value as string)}
                </Typography>
            )
        },
        {
            field: 'metadata',
            headerName: 'Details',
            minWidth: 300,
            flex: 1,
            renderCell: (params) => {
                const metadata = params.value as Record<string, unknown>;
                if (!metadata || Object.keys(metadata).length === 0) {
                    return (
                        <Typography variant="caption" color="text.secondary">
                            No additional details
                        </Typography>
                    );
                }
                return (
                    <Box sx={{ maxWidth: '100%', overflow: 'hidden', py: 0.5 }}>
                        {Object.entries(metadata).slice(0, 2).map(([key, val]) => (
                            <Typography
                                key={key}
                                variant="caption"
                                sx={{
                                    display: 'block',
                                    whiteSpace: 'nowrap',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    fontSize: '0.7rem',
                                    color: theme.palette.text.primary,
                                }}
                            >
                                <Box component="span" sx={{ fontWeight: 800, color: theme.palette.text.secondary }}>{key}:</Box>{' '}
                                {typeof val === 'object' ? JSON.stringify(val) : String(val)}
                            </Typography>
                        ))}
                    </Box>
                );
            },
        },
    ];

    if (!isAuthenticated) {
        return <PasswordGateDialog onAccessGranted={onAccessGranted} />;
    }

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, pb: 4 }}>
            {/* Header */}
            <Box>
                <Typography variant="h4" sx={{ fontWeight: 800, color: theme.palette.text.primary, letterSpacing: '-0.02em' }}>
                    Audit Logs
                </Typography>
                <Typography variant="body2" color="text.secondary">
                    Security events, administrative actions, and system access history
                </Typography>
            </Box>

            {/* Request Log Table Container */}
            <Paper
                variant="glass"
                sx={{
                    borderRadius: '24px',
                    overflow: 'hidden',
                    py: 1,
                }}
            >
                <Box sx={{ px: 3, py: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap' }}>
                    <Typography variant="h6" sx={{ fontWeight: 800, fontSize: '1rem', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                        Event Stream
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flex: { xs: 1, sm: 'none' }, width: { xs: '100%', sm: 'auto' } }}>
                        <TextField
                            select
                            value={status}
                            onChange={(e) => setStatus(e.target.value as AuditStatus)}
                            size="small"
                            sx={{
                                minWidth: 140,
                                '& .MuiOutlinedInput-root': {
                                    borderRadius: '12px',
                                    bgcolor: alpha(theme.palette.background.paper, 0.4),
                                }
                            }}
                        >
                            <MenuItem value="">All Statuses</MenuItem>
                            <MenuItem value="SUCCESS">Success</MenuItem>
                            <MenuItem value="FAILURE">Failure</MenuItem>
                        </TextField>
                        <DebouncedSearchInput
                            value={searchQuery}
                            onChange={setSearchQuery}
                            placeholder="Search actions, users, IPs..."
                            size="small"
                            sx={{
                                width: { xs: '100%', sm: 280 },
                                '& .MuiOutlinedInput-root': {
                                    borderRadius: '12px',
                                    bgcolor: alpha(theme.palette.background.paper, 0.4),
                                }
                            }}
                        />
                    </Box>
                </Box>
                <DataGrid
                    rows={logs.map((log) => ({ ...log, id: log._id }))}
                    columns={columns}
                    loading={isLoading}
                    density="compact"
                    paginationModel={paginationModel}
                    onPaginationModelChange={setPaginationModel}
                    pageSizeOptions={[25, 50, 100]}
                    rowCount={rowCount}
                    paginationMode="server"
                    disableRowSelectionOnClick
                    sx={{
                        border: 'none',
                        bgcolor: 'transparent',
                        '& .MuiDataGrid-columnHeaders': {
                            bgcolor: 'transparent',
                            borderBottom: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                        },
                        '& .MuiDataGrid-columnHeaderTitle': {
                            fontWeight: 800,
                            fontSize: '0.75rem',
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em',
                            color: alpha(theme.palette.text.primary, 0.7),
                        },
                        '& .MuiDataGrid-cell': {
                            borderColor: alpha(theme.palette.divider, 0.05),
                            display: 'flex',
                            alignItems: 'center',
                        },
                        '& .MuiDataGrid-row:hover': {
                            bgcolor: alpha(theme.palette.primary.main, 0.03),
                        },
                        '& .MuiDataGrid-cell:focus': {
                            outline: 'none',
                        },
                        '& .MuiDataGrid-footerContainer': {
                            borderTop: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                            bgcolor: 'transparent',
                        },
                        height: 700,
                    }}
                />
            </Paper>
        </Box>
    );
}
