import { useState, useEffect, useMemo, useCallback } from 'react';
import {
    Box,
    Grid,
    Paper,
    Typography,
    alpha,
    useTheme,
    Skeleton,
    IconButton,
    Tooltip,
    styled,
} from '@mui/material';
import {
    LineChart,
    BarChart,
    PieChart,
    axisClasses,
    useDrawingArea,
} from '@mui/x-charts';
import { DataGrid, type GridColDef, type GridPaginationModel } from '@mui/x-data-grid';
import {
    TrendingUp as TrendingUpIcon,
    Speed as SpeedIcon,
    Error as ErrorIcon,
    People as PeopleIcon,
    Refresh as RefreshIcon,
} from '@mui/icons-material';
import dayjs from 'dayjs';
import {
    getMetricsSummary,
    getMetricsTimeseries,
    getMetrics,
    type ApiMetric,
    type MetricsSummary,
    type MetricsResponse,
} from '@/services/analyticsService';
import { usePasswordGate } from '@/hooks/usePasswordGate';
import { PasswordGateDialog } from '@/components/analytics/PasswordGateDialog';
import { DebouncedSearchInput } from '@/components/common/DebouncedSearchInput';

const StyledText = styled('text')(({ theme }) => ({
    fill: theme.palette.text.primary,
    textAnchor: 'middle',
    dominantBaseline: 'central',
    fontWeight: 700,
}));

function PieCenterLabel({ children }: { children: React.ReactNode }) {
    const { width, height, left, top } = useDrawingArea();
    return (
        <StyledText x={left + width / 2} y={top + height / 2} style={{ fontSize: '1.5rem', fontFamily: 'Outfit, sans-serif' }}>
            {children}
        </StyledText>
    );
}

export default function AnalyticsPerformancePage() {
    const theme = useTheme();
    const { isAuthenticated, password, onAccessGranted } = usePasswordGate();
    const [isLoading, setIsLoading] = useState(true);
    const [isTableLoading, setIsTableLoading] = useState(false);
    const [summary, setSummary] = useState<MetricsSummary | null>(null);
    const [timeseries, setTimeseries] = useState<{ timestamp: string; requests: number; avgDurationMs: number; errors: number; uniqueUsers: number }[]>([]);
    const [metrics, setMetrics] = useState<ApiMetric[]>([]);
    const [statusDistribution, setStatusDistribution] = useState<{ _id: number; count: number }[]>([]);
    const [topPaths, setTopPaths] = useState<{ path: string; method: string; count: number; avgDurationMs: number }[]>([]);

    // Use current month as default date range
    const getMonthDateRange = useCallback(() => {
        const now = dayjs();
        return {
            startDate: now.startOf('month'),
            endDate: now.endOf('month'),
        };
    }, []);

    const monthDateRange = useMemo(() => getMonthDateRange(), [getMonthDateRange]);

    // Table pagination and search state
    const [paginationModel, setPaginationModel] = useState<GridPaginationModel>({
        page: 0,
        pageSize: 25,
    });
    const [rowCount, setRowCount] = useState(0);
    const [searchQuery, setSearchQuery] = useState('');

    // Fetch summary and timeseries data (charts)
    const fetchChartData = useCallback(async () => {
        if (!password) return;

        setIsLoading(true);
        try {
            const [summaryRes, timeseriesRes] = await Promise.all([
                getMetricsSummary(password, {
                    startDate: monthDateRange.startDate.toISOString(),
                    endDate: monthDateRange.endDate.toISOString(),
                }),
                getMetricsTimeseries(password, {
                    startDate: monthDateRange.startDate.toISOString(),
                    endDate: monthDateRange.endDate.toISOString(),
                    interval: '1h',
                }),
            ]);

            if (summaryRes.success) {
                setSummary(summaryRes.data.summary);
                setStatusDistribution(summaryRes.data.statusDistribution);
                setTopPaths(summaryRes.data.topPaths);
            }

            if (timeseriesRes.success) {
                setTimeseries(timeseriesRes.data);
            }
        } catch (error) {
            console.error('Failed to fetch chart data:', error);
        } finally {
            setIsLoading(false);
        }
    }, [password, monthDateRange]);

    // Fetch table data with pagination and search
    const fetchTableData = useCallback(async () => {
        if (!password) return;

        setIsTableLoading(true);
        try {
            const metricsRes: MetricsResponse = await getMetrics(password, {
                startDate: monthDateRange.startDate.toISOString(),
                endDate: monthDateRange.endDate.toISOString(),
                page: paginationModel.page + 1, // API uses 1-based indexing
                limit: paginationModel.pageSize,
                search: searchQuery || undefined,
            });

            if (metricsRes.success) {
                setMetrics(metricsRes.data);
                setRowCount(metricsRes.pagination.total);
            }
        } catch (error) {
            console.error('Failed to fetch table data:', error);
        } finally {
            setIsTableLoading(false);
        }
    }, [password, monthDateRange, paginationModel, searchQuery]);

    // Initial load - fetch chart data
    useEffect(() => {
        if (isAuthenticated && password) {
            fetchChartData();
        }
    }, [isAuthenticated, password, fetchChartData]);

    // Fetch table data when pagination or search changes
    useEffect(() => {
        if (isAuthenticated && password) {
            fetchTableData();
        }
    }, [isAuthenticated, password, paginationModel, searchQuery, fetchTableData]);

    const metricCards = useMemo(
        () => [
            {
                label: 'Total Requests',
                value: summary?.totalRequests ?? 0,
                icon: <TrendingUpIcon sx={{ fontSize: 24, color: theme.palette.primary.main }} />,
                color: theme.palette.primary.main,
                bgColor: alpha(theme.palette.primary.main, 0.1),
            },
            {
                label: 'Avg Response Time',
                value: `${(summary?.avgDurationMs ?? 0).toFixed(1)}ms`,
                icon: <SpeedIcon sx={{ fontSize: 24, color: theme.palette.success.main }} />,
                color: theme.palette.success.main,
                bgColor: alpha(theme.palette.success.main, 0.1),
            },
            {
                label: 'Error Rate',
                value: `${(summary?.errorRate ?? 0).toFixed(2)}%`,
                icon: <ErrorIcon sx={{ fontSize: 24, color: summary?.errorRate && summary.errorRate > 5 ? theme.palette.error.main : theme.palette.warning.main }} />,
                color: summary?.errorRate && summary.errorRate > 5 ? theme.palette.error.main : theme.palette.warning.main,
                bgColor: alpha(summary?.errorRate && summary.errorRate > 5 ? theme.palette.error.main : theme.palette.warning.main, 0.1),
            },
            {
                label: 'Unique Users',
                value: summary?.uniqueUserCount ?? 0,
                icon: <PeopleIcon sx={{ fontSize: 24, color: theme.palette.info.main }} />,
                color: theme.palette.info.main,
                bgColor: alpha(theme.palette.info.main, 0.1),
            },
        ],
        [summary, theme]
    );

    const columns: GridColDef<ApiMetric>[] = [
        {
            field: 'timestamp',
            headerName: 'Timestamp',
            width: 150,
            valueFormatter: (value) => dayjs(value as string).format('MMM D, HH:mm:ss'),
        },
        {
            field: 'method',
            headerName: 'Method',
            width: 80,
            renderCell: (params) => (
                <Typography
                    variant="caption"
                    sx={{
                        fontWeight: 800,
                        color:
                            params.value === 'GET' ? theme.palette.info.main :
                                params.value === 'POST' ? theme.palette.success.main :
                                    params.value === 'PUT' ? theme.palette.warning.main :
                                        params.value === 'DELETE' ? theme.palette.error.main :
                                            theme.palette.text.secondary,
                        fontSize: '0.7rem',
                    }}
                >
                    {params.value}
                </Typography>
            )
        },
        {
            field: 'path',
            headerName: 'Path',
            minWidth: 200,
            flex: 1,
            renderCell: (params) => (
                <Typography
                    variant="caption"
                    sx={{
                        fontFamily: 'JetBrains Mono, monospace',
                        color: theme.palette.text.primary,
                        fontSize: '0.75rem',
                    }}
                >
                    {params.value}
                </Typography>
            )
        },
        {
            field: 'statusCode',
            headerName: 'Status',
            width: 80,
            renderCell: (params) => (
                <Box
                    sx={{
                        px: 1,
                        py: 0.5,
                        borderRadius: '6px',
                        bgcolor:
                            params.value < 300
                                ? alpha(theme.palette.success.main, 0.1)
                                : params.value < 400
                                    ? alpha(theme.palette.warning.main, 0.1)
                                    : alpha(theme.palette.error.main, 0.1),
                        color:
                            params.value < 300
                                ? theme.palette.success.main
                                : params.value < 400
                                    ? theme.palette.warning.main
                                    : theme.palette.error.main,
                        fontWeight: 700,
                        fontSize: '0.65rem',
                        display: 'inline-flex',
                        alignItems: 'center',
                        lineHeight: 1,
                    }}
                >
                    {params.value}
                </Box>
            ),
        },
        {
            field: 'durationMs',
            headerName: 'Duration',
            width: 100,
            renderCell: (params) => (
                <Typography
                    variant="caption"
                    sx={{
                        fontWeight: 500,
                        color: (params.value as number) > 500 ? theme.palette.warning.main : theme.palette.text.secondary,
                    }}
                >
                    {`${(params.value as number).toFixed(0)}ms`}
                </Typography>
            )
        },
        {
            field: 'ipAddress',
            headerName: 'IP',
            width: 120,
            renderCell: (params) => (
                <Typography variant="caption" sx={{ color: theme.palette.text.secondary, fontSize: '0.7rem' }}>
                    {params.value}
                </Typography>
            )
        },
    ];

    const chartBaseStyle = {
        [`.${axisClasses.root}`]: {
            [`.${axisClasses.tickLabel}`]: {
                fill: theme.palette.text.secondary,
                fontSize: 11,
            },
            [`.${axisClasses.line}`]: {
                stroke: alpha(theme.palette.divider, 0.2),
            },
            [`.${axisClasses.tick}`]: {
                stroke: alpha(theme.palette.divider, 0.2),
            },
        },
    };

    if (!isAuthenticated) {
        return <PasswordGateDialog onAccessGranted={onAccessGranted} />;
    }

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, pb: 4 }}>
            {/* Header with month display and refresh */}
            <Box
                sx={{
                    display: 'flex',
                    flexDirection: { xs: 'column', md: 'row' },
                    alignItems: { xs: 'stretch', md: 'center' },
                    justifyContent: 'space-between',
                    gap: 2,
                }}
            >
                <Box>
                    <Typography variant="h4" sx={{ fontWeight: 800, color: theme.palette.text.primary, letterSpacing: '-0.02em' }}>
                        Performance Analytics
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        {monthDateRange.startDate.format('MMMM YYYY')} - API latency, throughput, and error rates
                    </Typography>
                </Box>
                <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', alignItems: 'center' }}>
                    <Tooltip title="Refresh Data">
                        <Box component="span">
                            <IconButton
                                onClick={() => {
                                    fetchChartData();
                                    fetchTableData();
                                }}
                                disabled={isLoading || isTableLoading}
                                sx={{
                                    bgcolor: alpha(theme.palette.primary.main, 0.1),
                                    color: theme.palette.primary.main,
                                    '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.2) }
                                }}
                            >
                                <RefreshIcon />
                            </IconButton>
                        </Box>
                    </Tooltip>
                </Box>
            </Box>

            {/* Metric Cards */}
            <Grid container spacing={3}>
                {metricCards.map((metric) => (
                    <Grid key={metric.label} size={{ xs: 12, sm: 6, md: 3 }}>
                        <Paper
                            variant="glass"
                            sx={{
                                p: 2.5,
                                borderRadius: '24px',
                                height: '100%',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: 1.5,
                            }}
                        >
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                <Box
                                    sx={{
                                        width: 40,
                                        height: 40,
                                        borderRadius: '12px',
                                        bgcolor: metric.bgColor,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                    }}
                                >
                                    {metric.icon}
                                </Box>
                                <Typography
                                    variant="caption"
                                    color="text.secondary"
                                    sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.8 }}
                                >
                                    {metric.label}
                                </Typography>
                            </Box>
                            {isLoading ? (
                                <Skeleton variant="text" width="60%" height={40} />
                            ) : (
                                <Typography
                                    variant="h4"
                                    sx={{
                                        fontFamily: 'Outfit, sans-serif',
                                        fontWeight: 700,
                                        color: metric.color,
                                    }}
                                >
                                    {metric.value}
                                </Typography>
                            )}
                        </Paper>
                    </Grid>
                ))}
            </Grid>

            {/* Charts Grid */}
            <Grid container spacing={3}>
                {/* Request Volume Chart */}
                <Grid size={{ xs: 12, lg: 8 }}>
                    <Paper
                        variant="glass"
                        sx={{
                            p: 3,
                            borderRadius: '24px',
                        }}
                    >
                        <Typography variant="h6" sx={{ fontWeight: 700, mb: 3, fontSize: '1.1rem' }}>
                            Traffic Trends
                        </Typography>
                        {isLoading ? (
                            <Skeleton variant="rectangular" height={300} sx={{ borderRadius: '12px' }} />
                        ) : (
                            <Box sx={{ height: 320, width: '100%' }}>
                                <LineChart
                                    dataset={timeseries}
                                    xAxis={[
                                        {
                                            dataKey: 'timestamp',
                                            scaleType: 'point',
                                            valueFormatter: (value) => dayjs(value).format('MMM D, HH:mm'),
                                        },
                                    ]}
                                    series={[
                                        {
                                            dataKey: 'requests',
                                            label: 'Requests',
                                            color: theme.palette.primary.main,
                                            area: true,
                                            showMark: true,
                                            curve: 'catmullRom',
                                        },
                                    ]}
                                    sx={chartBaseStyle}
                                    margin={{ left: 40, right: 20, top: 20, bottom: 40 }}
                                />
                            </Box>
                        )}
                    </Paper>
                </Grid>

                {/* Status Distribution */}
                <Grid size={{ xs: 12, lg: 4 }}>
                    <Paper
                        variant="glass"
                        sx={{
                            p: 3,
                            borderRadius: '24px',
                            height: '100%',
                        }}
                    >
                        <Typography variant="h6" sx={{ fontWeight: 700, mb: 3, fontSize: '1.1rem' }}>
                            Response Status
                        </Typography>
                        {isLoading ? (
                            <Skeleton variant="circular" width={200} height={200} sx={{ m: '0 auto' }} />
                        ) : (
                            <Box sx={{ height: 320, width: '100%', position: 'relative' }}>
                                <PieChart
                                    series={[
                                        {
                                            data: statusDistribution.map((item) => ({
                                                id: item._id,
                                                value: item.count,
                                                label: `HTTP ${item._id}`,
                                                color:
                                                    item._id < 300 ? theme.palette.success.main :
                                                        item._id < 400 ? theme.palette.warning.main :
                                                            theme.palette.error.main,
                                            })),
                                            innerRadius: '50%',
                                            outerRadius: '90%',
                                            paddingAngle: 1,
                                            cornerRadius: 4,
                                            highlightScope: { fade: 'global', highlight: 'item' },
                                        },
                                    ]}
                                    slotProps={{
                                        legend: {
                                            position: { vertical: 'bottom', horizontal: 'center' },
                                        },
                                    }}
                                    margin={{ bottom: 100 }}
                                >
                                    <PieCenterLabel>
                                        {statusDistribution.reduce((acc, curr) => acc + curr.count, 0)}
                                    </PieCenterLabel>
                                </PieChart>
                            </Box>
                        )}
                    </Paper>
                </Grid>

                {/* Response Times Chart */}
                <Grid size={{ xs: 12, md: 6 }}>
                    <Paper
                        variant="glass"
                        sx={{
                            p: 3,
                            borderRadius: '24px',
                        }}
                    >
                        <Typography variant="h6" sx={{ fontWeight: 700, mb: 3, fontSize: '1.1rem' }}>
                            Latency (ms)
                        </Typography>
                        {isLoading ? (
                            <Skeleton variant="rectangular" height={250} sx={{ borderRadius: '12px' }} />
                        ) : (
                            <Box sx={{ height: 280, width: '100%' }}>
                                <BarChart
                                    dataset={timeseries}
                                    xAxis={[
                                        {
                                            dataKey: 'timestamp',
                                            scaleType: 'band',
                                            valueFormatter: (value) => dayjs(value).format('HH:mm'),
                                        },
                                    ]}
                                    series={[
                                        {
                                            dataKey: 'avgDurationMs',
                                            label: 'Avg Latency',
                                            color: theme.palette.success.main,
                                        },
                                    ]}
                                    sx={chartBaseStyle}
                                    borderRadius={6}
                                    margin={{ left: 40, right: 20, top: 20, bottom: 40 }}
                                />
                            </Box>
                        )}
                    </Paper>
                </Grid>

                {/* Top Endpoints */}
                <Grid size={{ xs: 12, md: 6 }}>
                    <Paper
                        variant="glass"
                        sx={{
                            p: 3,
                            borderRadius: '24px',
                        }}
                    >
                        <Typography variant="h6" sx={{ fontWeight: 700, mb: 3, fontSize: '1.1rem' }}>
                            Most Hit Endpoints
                        </Typography>
                        {isLoading ? (
                            <Skeleton variant="rectangular" height={250} sx={{ borderRadius: '12px' }} />
                        ) : (
                            <Box sx={{ height: 280, width: '100%' }}>
                                <BarChart
                                    dataset={topPaths}
                                    xAxis={[
                                        {
                                            dataKey: 'path',
                                            scaleType: 'band',
                                            valueFormatter: (value) => value.toString().split('/').pop() || '/',
                                        },
                                    ]}
                                    series={[
                                        {
                                            dataKey: 'count',
                                            label: 'Hits',
                                            color: theme.palette.info.main,
                                        },
                                    ]}
                                    sx={chartBaseStyle}
                                    borderRadius={6}
                                    margin={{ left: 40, right: 20, top: 20, bottom: 40 }}
                                />
                            </Box>
                        )}
                    </Paper>
                </Grid>

                {/* Request Log Table */}
                <Grid size={{ xs: 12 }}>
                    <Paper
                        variant="glass"
                        sx={{
                            borderRadius: '24px',
                            overflow: 'hidden',
                            py: 1,
                        }}
                    >
                        <Box sx={{ px: 3, py: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2 }}>
                            <Typography variant="h6" sx={{ fontWeight: 800, fontSize: '1rem', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                                Live Traffic Stream
                            </Typography>
                            <DebouncedSearchInput
                                value={searchQuery}
                                onChange={setSearchQuery}
                                placeholder="Search by path, method, IP..."
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
                        <DataGrid
                            rows={metrics.map((m) => ({ ...m, id: m._id }))}
                            columns={columns}
                            loading={isTableLoading}
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
                                height: 500,
                            }}
                        />
                    </Paper>
                </Grid>
            </Grid>
        </Box>
    );
}
