import { useState, useEffect } from 'react';
import {
    Box,
    Paper,
    Typography,
    alpha,
    useTheme,
    TextField,
    MenuItem,
    Chip,
    InputAdornment,
} from '@mui/material';
import { DataGrid, type GridColDef } from '@mui/x-data-grid';
import dayjs from 'dayjs';
import {
    Info as InfoIcon,
    Warning as WarningIcon,
    Error as ErrorIcon,
    Search as SearchIcon,
} from '@mui/icons-material';
import { getLogs, type LogEntry } from '@/services/analyticsService';
import { usePasswordGate } from '@/hooks/usePasswordGate';
import { PasswordGateDialog } from '@/components/analytics/PasswordGateDialog';

type LogLevel = 'INFO' | 'WARN' | 'ERROR';

const LOG_LEVELS: LogLevel[] = ['INFO', 'WARN', 'ERROR'];

export default function AnalyticsLogsPage() {
    const theme = useTheme();
    const { isAuthenticated, password, onAccessGranted } = usePasswordGate();
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [total, setTotal] = useState(0);

    // Filters
    const [search, setSearch] = useState('');
    const [level, setLevel] = useState<LogLevel | ''>('');

    const fetchLogs = async (page = 0, pageSize = 25) => {
        if (!password) return;

        setIsLoading(true);
        try {
            const response = await getLogs(password, {
                search: search || undefined,
                level: (level || undefined) as LogLevel | undefined,
                page: page + 1,
                limit: pageSize,
            });

            if (response.success) {
                setLogs(response.data);
                setTotal(response.pagination.total);
            }
        } catch (error) {
            console.error('Failed to fetch logs:', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (isAuthenticated && password) {
            fetchLogs();
        }
    }, [isAuthenticated, password, search, level]);

    const getLevelIcon = (levelValue: LogLevel) => {
        switch (levelValue) {
            case 'INFO':
                return <InfoIcon />;
            case 'WARN':
                return <WarningIcon />;
            case 'ERROR':
                return <ErrorIcon />;
            default:
                return <InfoIcon />;
        }
    };

    const getLevelColor = (levelValue: LogLevel) => {
        switch (levelValue) {
            case 'INFO':
                return theme.palette.info.main;
            case 'WARN':
                return theme.palette.warning.main;
            case 'ERROR':
                return theme.palette.error.main;
            default:
                return theme.palette.info.main;
        }
    };

    const columns: GridColDef<LogEntry>[] = [
        {
            field: 'timestamp',
            headerName: 'Timestamp',
            width: 180,
            valueFormatter: (value) => dayjs(value as string).format('MMM D, HH:mm:ss'),
        },
        {
            field: 'level',
            headerName: 'Level',
            width: 100,
            renderCell: (params) => {
                const logLevel = params.value as LogLevel;
                return (
                    <Chip
                        icon={getLevelIcon(logLevel)}
                        label={logLevel}
                        size="small"
                        sx={{
                            bgcolor: alpha(getLevelColor(logLevel), 0.1),
                            color: getLevelColor(logLevel),
                            fontWeight: 600,
                            '& .MuiChip-icon': {
                                color: 'inherit',
                            },
                        }}
                    />
                );
            },
        },
        {
            field: 'source',
            headerName: 'Source',
            width: 200,
        },
        {
            field: 'message',
            headerName: 'Message',
            width: 500,
            flex: 1,
            renderCell: (params) => (
                <Typography
                    variant="body2"
                    sx={{
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                    }}
                >
                    {params.value}
                </Typography>
            ),
        },
    ];

    if (!isAuthenticated) {
        return <PasswordGateDialog onAccessGranted={onAccessGranted} />;
    }

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {/* Header */}
            <Box
                sx={{
                    display: 'flex',
                    flexDirection: { xs: 'column', md: 'row' },
                    alignItems: { xs: 'stretch', md: 'center' },
                    justifyContent: 'space-between',
                    gap: 2,
                }}
            >
                <Typography variant="h4" sx={{ fontWeight: 700 }}>
                    System Logs
                </Typography>
            </Box>

            {/* Filters */}
            <Paper
                variant="glass"
                sx={{
                    p: 3,
                    borderRadius: '24px',
                }}
            >
                <Box
                    sx={{
                        display: 'flex',
                        flexDirection: { xs: 'column', md: 'row' },
                        gap: 2,
                        flexWrap: 'wrap',
                        alignItems: 'center',
                    }}
                >
                    <TextField
                        label="Search"
                        placeholder="Search messages, sources, log levels..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        size="small"
                        sx={{ minWidth: 350, flex: 1 }}
                        InputProps={{
                            startAdornment: (
                                <InputAdornment position="start">
                                    <SearchIcon color="action" />
                                </InputAdornment>
                            ),
                        }}
                    />

                    <TextField
                        select
                        label="Log Level"
                        value={level}
                        onChange={(e) => setLevel(e.target.value as LogLevel)}
                        size="small"
                        sx={{ minWidth: 140 }}
                    >
                        <MenuItem value="">All Levels</MenuItem>
                        {LOG_LEVELS.map((l) => (
                            <MenuItem key={l} value={l}>
                                {l}
                            </MenuItem>
                        ))}
                    </TextField>
                </Box>
            </Paper>

            {/* Data Grid */}
            <Paper
                variant="glass"
                sx={{
                    borderRadius: '24px',
                    overflow: 'hidden',
                    p: 2,
                }}
            >
                <DataGrid
                    rows={logs.map((log) => ({ ...log, id: log._id }))}
                    columns={columns}
                    loading={isLoading}
                    rowCount={total}
                    paginationMode="server"
                    onPaginationModelChange={(model) => fetchLogs(model.page, model.pageSize)}
                    initialState={{
                        pagination: {
                            paginationModel: { page: 0, pageSize: 25 },
                        },
                    }}
                    pageSizeOptions={[25, 50, 100]}
                    disableRowSelectionOnClick
                    sx={{
                        border: 'none',
                        '& .MuiDataGrid-cell:focus': {
                            outline: 'none',
                        },
                    }}
                />
            </Paper>
        </Box>
    );
}
