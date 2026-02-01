import { useState, useMemo, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
    Box,
    Typography,
    useTheme,
    alpha,
    Grid,
    TextField,
    MenuItem,
    IconButton,
    Chip,
    Tooltip,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Skeleton,
    useMediaQuery,
} from '@mui/material';
import { motion, type Variants } from 'framer-motion';
import { LineChart, BarChart, PieChart } from '@mui/x-charts';
import {
    Activity,
    Clock,
    Zap,
    TrendingUp,
    AlertTriangle,
    ArrowLeft,
    RefreshCw,
    Server,
    Database,
    Gauge,
} from 'lucide-react';
import { DashboardCard } from '@/components/common/DashboardCard';
import adminService from '@/services/adminService';
import dayjs from 'dayjs';

const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: {
            staggerChildren: 0.05,
            delayChildren: 0.1,
        },
    },
};

const itemVariants: Variants = {
    hidden: { opacity: 0, y: 10 },
    visible: {
        opacity: 1,
        y: 0,
        transition: {
            duration: 0.3,
            ease: 'easeOut',
        },
    },
};

// Stat Card Component
function StatCard({
    title,
    value,
    unit,
    icon: Icon,
    color,
    subtitle,
}: {
    title: string;
    value: number | string;
    unit?: string;
    icon: React.ElementType;
    color: string;
    subtitle?: string;
}) {
    return (
        <DashboardCard>
            <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 1 }}>
                <Box sx={{ minWidth: 0, flex: 1 }}>
                    <Typography 
                        variant="body2" 
                        color="text.secondary" 
                        sx={{ 
                            mb: 0.5, 
                            fontSize: { xs: '11px', sm: '13px' },
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                        }}
                    >
                        {title}
                    </Typography>
                    <Typography 
                        variant="h4" 
                        sx={{ 
                            fontWeight: 700, 
                            color: 'text.primary',
                            fontSize: { xs: '1.25rem', sm: '1.75rem' },
                        }}
                    >
                        {typeof value === 'number' ? value.toLocaleString() : value}
                        {unit && (
                            <Typography component="span" variant="body2" color="text.secondary" sx={{ ml: 0.5 }}>
                                {unit}
                            </Typography>
                        )}
                    </Typography>
                    {subtitle && (
                        <Typography variant="caption" color="text.secondary" sx={{ fontSize: { xs: '10px', sm: '11px' } }}>
                            {subtitle}
                        </Typography>
                    )}
                </Box>
                <Box
                    sx={{
                        width: { xs: 36, sm: 48 },
                        height: { xs: 36, sm: 48 },
                        borderRadius: '12px',
                        bgcolor: alpha(color, 0.1),
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: color,
                        flexShrink: 0,
                    }}
                >
                    <Icon size={20} />
                </Box>
            </Box>
        </DashboardCard>
    );
}

// Format duration for display
function formatDuration(ms: number): string {
    if (ms < 1000) return `${Math.round(ms)}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
}

// Format bytes for display
function formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export function PerformancePage() {
    const theme = useTheme();
    const navigate = useNavigate();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

    // Time range state
    const [hours, setHours] = useState<number>(24);

    // Performance stats query
    const {
        data: stats,
        isLoading: statsLoading,
        refetch: refetchStats,
    } = useQuery({
        queryKey: ['admin', 'performance', 'stats', hours],
        queryFn: () => adminService.getPerformanceStats(hours),
        refetchInterval: 60000,
    });

    // Performance trends query
    const {
        data: trends,
        isLoading: trendsLoading,
    } = useQuery({
        queryKey: ['admin', 'performance', 'trends', hours],
        queryFn: () => adminService.getPerformanceTrends(hours),
    });

    // Endpoint performance query
    const {
        data: endpoints,
        isLoading: endpointsLoading,
    } = useQuery({
        queryKey: ['admin', 'performance', 'endpoints', hours],
        queryFn: () => adminService.getEndpointPerformance(hours, 15),
    });

    // Slowest requests query
    const {
        data: slowest,
        isLoading: slowestLoading,
    } = useQuery({
        queryKey: ['admin', 'performance', 'slowest', hours],
        queryFn: () => adminService.getSlowestRequests(hours, 10),
    });

    // Refresh all data
    const handleRefresh = useCallback(() => {
        refetchStats();
    }, [refetchStats]);

    // Chart data preparation - Response Time Trends
    const trendChartData = useMemo(() => {
        if (!trends?.length) return { xAxis: [], avgDuration: [], p95Duration: [], requestCount: [] };
        
        return {
            xAxis: trends.map((t) => dayjs(t.timestamp).format('HH:mm')),
            avgDuration: trends.map((t) => t.avgDuration),
            p95Duration: trends.map((t) => t.p95Duration),
            requestCount: trends.map((t) => t.requestCount),
        };
    }, [trends]);

    // Status code distribution for pie chart
    const statusDistribution = useMemo(() => {
        if (!stats) return [];
        const successRate = 100 - stats.errorRate;
        return [
            { id: 0, value: successRate, label: 'Success', color: theme.palette.success.main },
            { id: 1, value: stats.errorRate, label: 'Errors', color: theme.palette.error.main },
        ];
    }, [stats, theme]);

    return (
        <motion.div
            initial="hidden"
            animate="visible"
            variants={containerVariants}
            style={{ height: '100%', width: '100%', display: 'flex', flexDirection: 'column' }}
        >
            <Box
                sx={{
                    width: '100%',
                    maxWidth: 1800,
                    mx: 'auto',
                    p: { xs: 2, sm: 3 },
                    flexGrow: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: { xs: 2, sm: 3 },
                }}
            >
                {/* Header */}
                <motion.div variants={itemVariants}>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 1.5, sm: 2 } }}>
                            <Tooltip title="Back to Logs">
                                <IconButton 
                                    onClick={() => navigate('/administration')}
                                    sx={{ bgcolor: alpha(theme.palette.primary.main, 0.1) }}
                                >
                                    <ArrowLeft size={isMobile ? 18 : 20} />
                                </IconButton>
                            </Tooltip>
                            <Box
                                sx={{
                                    width: { xs: 40, sm: 48 },
                                    height: { xs: 40, sm: 48 },
                                    borderRadius: '12px',
                                    bgcolor: alpha(theme.palette.primary.main, 0.1),
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                }}
                            >
                                <Gauge size={isMobile ? 20 : 24} color={theme.palette.primary.main} />
                            </Box>
                            <Box>
                                <Typography variant={isMobile ? 'h6' : 'h5'} sx={{ fontWeight: 700 }}>
                                    Performance Analytics
                                </Typography>
                                <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '12px', sm: '14px' } }}>
                                    API response times, throughput, and system health
                                </Typography>
                            </Box>
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <TextField
                                select
                                size="small"
                                value={hours}
                                onChange={(e) => setHours(Number(e.target.value))}
                                sx={{ minWidth: 120 }}
                            >
                                <MenuItem value={1}>Last 1h</MenuItem>
                                <MenuItem value={6}>Last 6h</MenuItem>
                                <MenuItem value={24}>Last 24h</MenuItem>
                                <MenuItem value={48}>Last 48h</MenuItem>
                                <MenuItem value={168}>Last 7d</MenuItem>
                            </TextField>
                            <Tooltip title="Refresh data">
                                <IconButton onClick={handleRefresh} sx={{ bgcolor: alpha(theme.palette.primary.main, 0.1) }}>
                                    <RefreshCw size={isMobile ? 18 : 20} />
                                </IconButton>
                            </Tooltip>
                        </Box>
                    </Box>
                </motion.div>

                {/* Stats Cards - Row 1 */}
                <motion.div variants={itemVariants}>
                    <Grid container spacing={2}>
                        <Grid size={{ xs: 6, sm: 3 }}>
                            {statsLoading ? (
                                <Skeleton variant="rounded" height={120} sx={{ borderRadius: '24px' }} />
                            ) : (
                                <StatCard
                                    title="Total Requests"
                                    value={stats?.totalRequests || 0}
                                    icon={Activity}
                                    color={theme.palette.primary.main}
                                    subtitle={`Last ${hours}h`}
                                />
                            )}
                        </Grid>
                        <Grid size={{ xs: 6, sm: 3 }}>
                            {statsLoading ? (
                                <Skeleton variant="rounded" height={120} sx={{ borderRadius: '24px' }} />
                            ) : (
                                <StatCard
                                    title="Avg Response"
                                    value={formatDuration(stats?.avgDuration || 0)}
                                    icon={Clock}
                                    color={theme.palette.info.main}
                                />
                            )}
                        </Grid>
                        <Grid size={{ xs: 6, sm: 3 }}>
                            {statsLoading ? (
                                <Skeleton variant="rounded" height={120} sx={{ borderRadius: '24px' }} />
                            ) : (
                                <StatCard
                                    title="P95 Response"
                                    value={formatDuration(stats?.p90Duration || 0)}
                                    icon={TrendingUp}
                                    color={theme.palette.warning.main}
                                />
                            )}
                        </Grid>
                        <Grid size={{ xs: 6, sm: 3 }}>
                            {statsLoading ? (
                                <Skeleton variant="rounded" height={120} sx={{ borderRadius: '24px' }} />
                            ) : (
                                <StatCard
                                    title="Error Rate"
                                    value={`${(stats?.errorRate || 0).toFixed(2)}%`}
                                    icon={AlertTriangle}
                                    color={stats?.errorRate && stats.errorRate > 5 ? theme.palette.error.main : theme.palette.success.main}
                                />
                            )}
                        </Grid>
                    </Grid>
                </motion.div>

                {/* Stats Cards - Row 2 (Percentiles) */}
                <motion.div variants={itemVariants}>
                    <Grid container spacing={2}>
                        <Grid size={{ xs: 4, sm: 2 }}>
                            {statsLoading ? (
                                <Skeleton variant="rounded" height={100} sx={{ borderRadius: '24px' }} />
                            ) : (
                                <StatCard
                                    title="P50"
                                    value={formatDuration(stats?.p50Duration || 0)}
                                    icon={Zap}
                                    color={theme.palette.success.main}
                                />
                            )}
                        </Grid>
                        <Grid size={{ xs: 4, sm: 2 }}>
                            {statsLoading ? (
                                <Skeleton variant="rounded" height={100} sx={{ borderRadius: '24px' }} />
                            ) : (
                                <StatCard
                                    title="P90"
                                    value={formatDuration(stats?.p90Duration || 0)}
                                    icon={Zap}
                                    color={theme.palette.warning.main}
                                />
                            )}
                        </Grid>
                        <Grid size={{ xs: 4, sm: 2 }}>
                            {statsLoading ? (
                                <Skeleton variant="rounded" height={100} sx={{ borderRadius: '24px' }} />
                            ) : (
                                <StatCard
                                    title="P99"
                                    value={formatDuration(stats?.p99Duration || 0)}
                                    icon={Zap}
                                    color={theme.palette.error.main}
                                />
                            )}
                        </Grid>
                        <Grid size={{ xs: 4, sm: 2 }}>
                            {statsLoading ? (
                                <Skeleton variant="rounded" height={100} sx={{ borderRadius: '24px' }} />
                            ) : (
                                <StatCard
                                    title="Max"
                                    value={formatDuration(stats?.maxDuration || 0)}
                                    icon={TrendingUp}
                                    color={theme.palette.error.main}
                                />
                            )}
                        </Grid>
                        <Grid size={{ xs: 4, sm: 2 }}>
                            {statsLoading ? (
                                <Skeleton variant="rounded" height={100} sx={{ borderRadius: '24px' }} />
                            ) : (
                                <StatCard
                                    title="Avg Request"
                                    value={formatBytes(stats?.avgRequestSize || 0)}
                                    icon={Server}
                                    color={theme.palette.info.main}
                                />
                            )}
                        </Grid>
                        <Grid size={{ xs: 4, sm: 2 }}>
                            {statsLoading ? (
                                <Skeleton variant="rounded" height={100} sx={{ borderRadius: '24px' }} />
                            ) : (
                                <StatCard
                                    title="Avg Memory"
                                    value={formatBytes(stats?.avgMemoryUsage || 0)}
                                    icon={Database}
                                    color={theme.palette.secondary.main}
                                />
                            )}
                        </Grid>
                    </Grid>
                </motion.div>

                {/* Charts Row */}
                <motion.div variants={itemVariants}>
                    <Grid container spacing={{ xs: 2, md: 3 }}>
                        {/* Line Chart - Response Time Trends */}
                        <Grid size={{ xs: 12, lg: 8 }}>
                            <DashboardCard>
                                <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, fontSize: { xs: '1rem', sm: '1.25rem' } }}>
                                    Response Time Trends
                                </Typography>
                                {trendsLoading ? (
                                    <Skeleton variant="rounded" height={isMobile ? 200 : 300} />
                                ) : (
                                    <Box sx={{ width: '100%', height: { xs: 200, sm: 300 }, mx: -1 }}>
                                        <LineChart
                                            xAxis={[
                                                {
                                                    data: trendChartData.xAxis,
                                                    scaleType: 'point',
                                                    tickLabelStyle: {
                                                        fill: theme.palette.text.secondary,
                                                        fontSize: isMobile ? 9 : 11,
                                                    },
                                                },
                                            ]}
                                            series={[
                                                {
                                                    data: trendChartData.avgDuration,
                                                    label: 'Avg Duration',
                                                    color: theme.palette.primary.main,
                                                    curve: 'monotoneX',
                                                    area: true,
                                                },
                                                {
                                                    data: trendChartData.p95Duration,
                                                    label: 'P95 Duration',
                                                    color: theme.palette.warning.main,
                                                    curve: 'monotoneX',
                                                },
                                            ]}
                                            sx={{
                                                '.MuiLineElement-root': { strokeWidth: 2 },
                                                '.MuiAreaElement-root': { fillOpacity: 0.1 },
                                                '.MuiChartsAxis-line': { stroke: alpha(theme.palette.divider, 0.2) },
                                                '.MuiChartsAxis-tick': { stroke: alpha(theme.palette.divider, 0.2) },
                                            }}
                                            margin={{ left: isMobile ? 40 : 50, right: isMobile ? 10 : 20, top: 20, bottom: isMobile ? 30 : 40 }}
                                        />
                                    </Box>
                                )}
                            </DashboardCard>
                        </Grid>

                        {/* Pie Chart - Success/Error Rate */}
                        <Grid size={{ xs: 12, lg: 4 }}>
                            <DashboardCard>
                                <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, fontSize: { xs: '1rem', sm: '1.25rem' } }}>
                                    Success Rate
                                </Typography>
                                {statsLoading ? (
                                    <Skeleton variant="circular" width={isMobile ? 150 : 200} height={isMobile ? 150 : 200} sx={{ mx: 'auto' }} />
                                ) : (
                                    <Box sx={{ width: '100%', height: { xs: 200, sm: 250 }, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <PieChart
                                            series={[
                                                {
                                                    data: statusDistribution,
                                                    innerRadius: isMobile ? 35 : 50,
                                                    paddingAngle: 2,
                                                    cornerRadius: 4,
                                                    highlightScope: { fade: 'global', highlight: 'item' },
                                                },
                                            ]}
                                            slotProps={{
                                                legend: {
                                                    direction: 'horizontal',
                                                    position: { vertical: 'bottom', horizontal: 'center' },
                                                },
                                            }}
                                            width={isMobile ? 250 : 300}
                                            height={isMobile ? 200 : 250}
                                        />
                                    </Box>
                                )}
                            </DashboardCard>
                        </Grid>
                    </Grid>
                </motion.div>

                {/* Throughput Chart */}
                <motion.div variants={itemVariants}>
                    <DashboardCard>
                        <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, fontSize: { xs: '1rem', sm: '1.25rem' } }}>
                            Throughput (Requests/Hour)
                        </Typography>
                        {trendsLoading ? (
                            <Skeleton variant="rounded" height={isMobile ? 150 : 200} />
                        ) : (
                            <Box sx={{ width: '100%', height: { xs: 150, sm: 200 }, mx: -1 }}>
                                <BarChart
                                    xAxis={[
                                        {
                                            data: trendChartData.xAxis,
                                            scaleType: 'band',
                                            tickLabelStyle: {
                                                fill: theme.palette.text.secondary,
                                                fontSize: isMobile ? 9 : 11,
                                            },
                                        },
                                    ]}
                                    series={[
                                        {
                                            data: trendChartData.requestCount,
                                            label: 'Requests',
                                            color: theme.palette.primary.main,
                                        },
                                    ]}
                                    sx={{
                                        '.MuiBarElement-root': { rx: 4 },
                                    }}
                                    margin={{ left: isMobile ? 40 : 50, right: 10, top: 20, bottom: 30 }}
                                    hideLegend
                                />
                            </Box>
                        )}
                    </DashboardCard>
                </motion.div>

                {/* Endpoint Performance Table */}
                <motion.div variants={itemVariants}>
                    <DashboardCard noPadding>
                        <Box sx={{ p: { xs: 1.5, sm: 2.5 } }}>
                            <Typography variant="h6" sx={{ fontWeight: 600, fontSize: { xs: '1rem', sm: '1.25rem' } }}>
                                Endpoint Performance
                            </Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ fontSize: '12px', mb: 2 }}>
                                Response times by API endpoint
                            </Typography>
                        </Box>
                        
                        {endpointsLoading ? (
                            <Box sx={{ px: 2, pb: 2 }}>
                                {[...Array(5)].map((_, i) => (
                                    <Skeleton key={i} variant="text" height={50} />
                                ))}
                            </Box>
                        ) : (
                            <TableContainer>
                                <Table size="small">
                                    <TableHead>
                                        <TableRow>
                                            <TableCell sx={{ fontWeight: 600 }}>Endpoint</TableCell>
                                            <TableCell sx={{ fontWeight: 600 }} align="right">Calls</TableCell>
                                            <TableCell sx={{ fontWeight: 600 }} align="right">Avg</TableCell>
                                            <TableCell sx={{ fontWeight: 600 }} align="right">P90</TableCell>
                                            <TableCell sx={{ fontWeight: 600 }} align="right">P99</TableCell>
                                            <TableCell sx={{ fontWeight: 600 }} align="right">Error %</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {endpoints?.slice(0, 15).map((endpoint) => (
                                            <TableRow key={`${endpoint.method}-${endpoint.url}`} hover>
                                                <TableCell>
                                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                        <Chip 
                                                            label={endpoint.method} 
                                                            size="small" 
                                                            sx={{ 
                                                                fontSize: '10px',
                                                                height: 20,
                                                                bgcolor: alpha(
                                                                    endpoint.method === 'GET' ? theme.palette.success.main :
                                                                    endpoint.method === 'POST' ? theme.palette.primary.main :
                                                                    endpoint.method === 'PUT' ? theme.palette.warning.main :
                                                                    endpoint.method === 'DELETE' ? theme.palette.error.main :
                                                                    theme.palette.grey[500],
                                                                    0.1
                                                                ),
                                                                color: endpoint.method === 'GET' ? theme.palette.success.main :
                                                                    endpoint.method === 'POST' ? theme.palette.primary.main :
                                                                    endpoint.method === 'PUT' ? theme.palette.warning.main :
                                                                    endpoint.method === 'DELETE' ? theme.palette.error.main :
                                                                    theme.palette.grey[500],
                                                            }}
                                                        />
                                                        <Typography 
                                                            variant="body2" 
                                                            sx={{ 
                                                                fontFamily: 'monospace', 
                                                                fontSize: '12px',
                                                                maxWidth: { xs: 150, sm: 300 },
                                                                overflow: 'hidden',
                                                                textOverflow: 'ellipsis',
                                                                whiteSpace: 'nowrap',
                                                            }}
                                                        >
                                                            {endpoint.url}
                                                        </Typography>
                                                    </Box>
                                                </TableCell>
                                                <TableCell align="right">
                                                    <Typography variant="body2">{endpoint.count.toLocaleString()}</Typography>
                                                </TableCell>
                                                <TableCell align="right">
                                                    <Typography 
                                                        variant="body2" 
                                                        sx={{ 
                                                            color: endpoint.avgDuration > 500 ? theme.palette.warning.main : 
                                                                   endpoint.avgDuration > 1000 ? theme.palette.error.main : 
                                                                   theme.palette.text.primary 
                                                        }}
                                                    >
                                                        {formatDuration(endpoint.avgDuration)}
                                                    </Typography>
                                                </TableCell>
                                                <TableCell align="right">
                                                    <Typography variant="body2">{formatDuration(endpoint.p90Duration)}</Typography>
                                                </TableCell>
                                                <TableCell align="right">
                                                    <Typography variant="body2">{formatDuration(endpoint.p99Duration)}</Typography>
                                                </TableCell>
                                                <TableCell align="right">
                                                    <Chip
                                                        label={`${endpoint.errorRate.toFixed(1)}%`}
                                                        size="small"
                                                        sx={{
                                                            bgcolor: alpha(
                                                                endpoint.errorRate > 5 ? theme.palette.error.main :
                                                                endpoint.errorRate > 1 ? theme.palette.warning.main :
                                                                theme.palette.success.main,
                                                                0.1
                                                            ),
                                                            color: endpoint.errorRate > 5 ? theme.palette.error.main :
                                                                   endpoint.errorRate > 1 ? theme.palette.warning.main :
                                                                   theme.palette.success.main,
                                                            fontSize: '11px',
                                                            height: 22,
                                                        }}
                                                    />
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                        {(!endpoints || endpoints.length === 0) && (
                                            <TableRow>
                                                <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                                                    <Typography color="text.secondary">No endpoint data available</Typography>
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        )}
                    </DashboardCard>
                </motion.div>

                {/* Slowest Requests */}
                <motion.div variants={itemVariants}>
                    <DashboardCard noPadding>
                        <Box sx={{ p: { xs: 1.5, sm: 2.5 } }}>
                            <Typography variant="h6" sx={{ fontWeight: 600, fontSize: { xs: '1rem', sm: '1.25rem' } }}>
                                Slowest Requests
                            </Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ fontSize: '12px', mb: 2 }}>
                                Top slowest API calls in the selected time range
                            </Typography>
                        </Box>
                        
                        {slowestLoading ? (
                            <Box sx={{ px: 2, pb: 2 }}>
                                {[...Array(5)].map((_, i) => (
                                    <Skeleton key={i} variant="text" height={50} />
                                ))}
                            </Box>
                        ) : (
                            <TableContainer>
                                <Table size="small">
                                    <TableHead>
                                        <TableRow>
                                            <TableCell sx={{ fontWeight: 600 }}>Endpoint</TableCell>
                                            <TableCell sx={{ fontWeight: 600 }} align="right">Duration</TableCell>
                                            <TableCell sx={{ fontWeight: 600 }} align="right">Status</TableCell>
                                            <TableCell sx={{ fontWeight: 600 }}>Time</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {slowest?.map((req) => (
                                            <TableRow key={req._id} hover>
                                                <TableCell>
                                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                        <Chip 
                                                            label={req.method} 
                                                            size="small" 
                                                            sx={{ fontSize: '10px', height: 20 }}
                                                        />
                                                        <Typography 
                                                            variant="body2" 
                                                            sx={{ 
                                                                fontFamily: 'monospace', 
                                                                fontSize: '12px',
                                                                maxWidth: { xs: 150, sm: 300 },
                                                                overflow: 'hidden',
                                                                textOverflow: 'ellipsis',
                                                                whiteSpace: 'nowrap',
                                                            }}
                                                        >
                                                            {req.url}
                                                        </Typography>
                                                    </Box>
                                                </TableCell>
                                                <TableCell align="right">
                                                    <Typography 
                                                        variant="body2" 
                                                        sx={{ 
                                                            fontWeight: 600,
                                                            color: req.duration > 5000 ? theme.palette.error.main : 
                                                                   req.duration > 2000 ? theme.palette.warning.main : 
                                                                   theme.palette.text.primary 
                                                        }}
                                                    >
                                                        {formatDuration(req.duration)}
                                                    </Typography>
                                                </TableCell>
                                                <TableCell align="right">
                                                    <Chip
                                                        label={req.statusCode}
                                                        size="small"
                                                        sx={{
                                                            bgcolor: alpha(
                                                                req.statusCode >= 500 ? theme.palette.error.main :
                                                                req.statusCode >= 400 ? theme.palette.warning.main :
                                                                theme.palette.success.main,
                                                                0.1
                                                            ),
                                                            color: req.statusCode >= 500 ? theme.palette.error.main :
                                                                   req.statusCode >= 400 ? theme.palette.warning.main :
                                                                   theme.palette.success.main,
                                                            fontSize: '11px',
                                                        }}
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                    <Typography variant="caption" color="text.secondary">
                                                        {dayjs(req.timestamp).format('MMM D, HH:mm:ss')}
                                                    </Typography>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                        {(!slowest || slowest.length === 0) && (
                                            <TableRow>
                                                <TableCell colSpan={4} align="center" sx={{ py: 4 }}>
                                                    <Typography color="text.secondary">No slow requests found</Typography>
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        )}
                    </DashboardCard>
                </motion.div>
            </Box>
        </motion.div>
    );
}
