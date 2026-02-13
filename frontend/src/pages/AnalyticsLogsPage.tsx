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
import dayjs from 'dayjs';
import {
    Info as InfoIcon,
    Warning as WarningIcon,
    Error as ErrorIcon,
    ChevronRight as ChevronRightIcon,
    FilterList as FilterListIcon,
} from '@mui/icons-material';
import { getLogs, type LogEntry } from '@/services/analyticsService';
import { usePasswordGate } from '@/hooks/usePasswordGate';
import { PasswordGateDialog } from '@/components/analytics/PasswordGateDialog';
import { DebouncedSearchInput } from '@/components/common/DebouncedSearchInput';
import { LogDetailOverlay } from '@/components/analytics/LogDetailOverlay';

type LogLevel = 'INFO' | 'WARN' | 'ERROR';
const LOG_LEVELS: LogLevel[] = ['INFO', 'WARN', 'ERROR'];

export default function AnalyticsLogsPage() {
    const theme = useTheme();
    const { isAuthenticated, password, onAccessGranted } = usePasswordGate();
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [rowCount, setRowCount] = useState(0);

    // Overlay state
    const [selectedLog, setSelectedLog] = useState<LogEntry | null>(null);
    const [isOverlayOpen, setIsOverlayOpen] = useState(false);

    // Filters and pagination state
    const [searchQuery, setSearchQuery] = useState('');
    const [level, setLevel] = useState<LogLevel | ''>('');
    const [paginationModel, setPaginationModel] = useState<GridPaginationModel>({
        page: 0,
        pageSize: 10,
    });

    const fetchLogs = useCallback(async () => {
        if (!password) return;

        setIsLoading(true);
        try {
            const response = await getLogs(password, {
                search: searchQuery || undefined,
                level: (level || undefined) as LogLevel | undefined,
                page: paginationModel.page + 1,
                limit: paginationModel.pageSize,
            });

            if (response.success) {
                setLogs(response.data);
                setRowCount(response.pagination.total);
            }
        } catch (error) {
            console.error('Failed to fetch logs:', error);
        } finally {
            setIsLoading(false);
        }
    }, [password, searchQuery, level, paginationModel]);

    useEffect(() => {
        if (isAuthenticated && password) {
            fetchLogs();
        }
    }, [isAuthenticated, password, fetchLogs]);

    const handleViewDetails = useCallback((log: LogEntry) => {
        setSelectedLog(log);
        setIsOverlayOpen(true);
    }, []);

    const getLevelColor = (levelValue: LogLevel) => {
        switch (levelValue) {
            case 'INFO': return theme.palette.info.main;
            case 'WARN': return theme.palette.warning.main;
            case 'ERROR': return theme.palette.error.main;
            default: return theme.palette.info.main;
        }
    };

    const getLevelIcon = (levelValue: LogLevel) => {
        switch (levelValue) {
            case 'INFO': return <InfoIcon sx={{ fontSize: '0.9rem' }} />;
            case 'WARN': return <WarningIcon sx={{ fontSize: '0.9rem' }} />;
            case 'ERROR': return <ErrorIcon sx={{ fontSize: '0.9rem' }} />;
            default: return <InfoIcon sx={{ fontSize: '0.9rem' }} />;
        }
    };

    const columns: GridColDef<LogEntry>[] = [
        {
            field: 'timestamp',
            headerName: 'Timestamp',
            flex: 1,
            minWidth: 160,
            valueFormatter: (value) => dayjs(value as string).format('MMM D, HH:mm:ss'),
        },
        {
            field: 'level',
            headerName: 'Level',
            width: 100,
            renderCell: (params) => {
                const logLevel = params.value as LogLevel;
                const color = getLevelColor(logLevel);
                return (
                    <Box
                        sx={{
                            px: 1,
                            py: 0.5,
                            borderRadius: '6px',
                            bgcolor: alpha(color, 0.1),
                            color: color,
                            fontWeight: 700,
                            fontSize: '0.65rem',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 0.5,
                            lineHeight: 1,
                        }}
                    >
                        {getLevelIcon(logLevel)}
                        {logLevel}
                    </Box>
                );
            },
        },
        {
            field: 'source',
            headerName: 'Source',
            flex: 1.2,
            minWidth: 150,
            renderCell: (params) => (
                <Typography variant="caption" sx={{ fontWeight: 600, color: theme.palette.text.primary, fontFamily: 'JetBrains Mono, monospace' }}>
                    {params.value}
                </Typography>
            ),
        },
        {
            field: 'message',
            headerName: 'Message',
            flex: 3,
            minWidth: 300,
            renderCell: (params) => (
                <Typography
                    variant="caption"
                    sx={{
                        color: theme.palette.text.secondary,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                    }}
                >
                    {params.value}
                </Typography>
            ),
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
                    System Logs
                </Typography>
                <Typography variant="body2" color="text.secondary">
                    Backend service logs, runtime events, and error tracking
                </Typography>
            </Box>

            {/* Logs Table Container */}
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
                        Log Stream
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flex: { xs: 1, sm: 'none' }, width: { xs: '100%', sm: 'auto' } }}>
                        <TextField
                            select
                            value={level}
                            onChange={(e) => setLevel(e.target.value as LogLevel)}
                            size="small"
                            label="Level"
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
                            <MenuItem value="">All Levels</MenuItem>
                            {LOG_LEVELS.map((l) => (
                                <MenuItem key={l} value={l}>{l}</MenuItem>
                            ))}
                        </TextField>
                        <DebouncedSearchInput
                            value={searchQuery}
                            onChange={setSearchQuery}
                            placeholder="Search messages, sources..."
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

            <LogDetailOverlay
                open={isOverlayOpen}
                onClose={() => setIsOverlayOpen(false)}
                log={selectedLog}
            />
        </Box>
    );
}
