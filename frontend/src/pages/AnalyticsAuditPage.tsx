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
    ChevronRight as ChevronRightIcon,
    FilterList as FilterListIcon,
} from '@mui/icons-material';
import { getAuditLogs, type AuditLogEntry } from '@/services/analyticsService';
import auditService, { type AuditAction, type AuditStatus } from '@/services/auditService';
import { usePasswordGate } from '@/hooks/usePasswordGate';
import { PasswordGateDialog } from '@/components/analytics/PasswordGateDialog';
import { DebouncedSearchInput } from '@/components/common/DebouncedSearchInput';
import { AuditLogDetailOverlay } from '@/components/analytics/AuditLogDetailOverlay';

export default function AnalyticsAuditPage() {
    const theme = useTheme();
    const { isAuthenticated, password, onAccessGranted } = usePasswordGate();
    const [logs, setLogs] = useState<AuditLogEntry[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [rowCount, setRowCount] = useState(0);

    // Overlay state
    const [selectedLog, setSelectedLog] = useState<AuditLogEntry | null>(null);
    const [isOverlayOpen, setIsOverlayOpen] = useState(false);

    // Filters and pagination state
    const [searchQuery, setSearchQuery] = useState('');
    const [status, setStatus] = useState<AuditStatus | ''>('');
    const [paginationModel, setPaginationModel] = useState<GridPaginationModel>({
        page: 0,
        pageSize: 10,
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

    const handleViewDetails = useCallback((log: AuditLogEntry) => {
        setSelectedLog(log);
        setIsOverlayOpen(true);
    }, []);

    const columns: GridColDef<AuditLogEntry>[] = [
        {
            field: 'timestamp',
            headerName: 'Timestamp',
            flex: 1.2,
            minWidth: 160,
            valueFormatter: (value) => auditService.formatTimestamp(value as string),
        },
        {
            field: 'action',
            headerName: 'Action',
            flex: 1.5,
            minWidth: 180,
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
            flex: 1.5,
            minWidth: 180,
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
            field: 'id',
            headerName: '',
            width: 50,
            sortable: false,
            filterable: false,
            disableColumnMenu: true,
            renderCell: () => (
                <ChevronRightIcon
                    sx={{
                        color: alpha(theme.palette.text.primary, 0.2),
                        fontSize: '1.2rem'
                    }}
                />
            ),
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
                            label="Status"
                            InputProps={{
                                startAdornment: (
                                    <FilterListIcon sx={{ mr: 1, fontSize: '1rem', color: theme.palette.text.secondary }} />
                                ),
                            }}
                            SelectProps={{
                                displayEmpty: true,
                            }}
                            sx={{
                                minWidth: 160,
                                '& .MuiOutlinedInput-root': {
                                    borderRadius: '12px',
                                    bgcolor: alpha(theme.palette.background.paper, 0.4),
                                },
                                '& .MuiInputLabel-root': {
                                    fontSize: '0.85rem',
                                    fontWeight: 600,
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
                    pageSizeOptions={[10, 25, 50, 100]}
                    rowCount={rowCount}
                    paginationMode="server"
                    disableRowSelectionOnClick
                    onRowClick={(params) => handleViewDetails(params.row)}
                    autoHeight
                    sx={{
                        border: 'none',
                        bgcolor: 'transparent',
                        '& .MuiDataGrid-row': {
                            cursor: 'pointer',
                        },
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
                    }}
                />
            </Paper>

            <AuditLogDetailOverlay
                open={isOverlayOpen}
                onClose={() => setIsOverlayOpen(false)}
                log={selectedLog}
            />
        </Box>
    );
}
