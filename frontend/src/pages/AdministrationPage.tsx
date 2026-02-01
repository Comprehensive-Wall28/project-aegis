import { useState, useMemo, useCallback, useEffect } from 'react';
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
    InputAdornment,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TablePagination,
    Skeleton,
    useMediaQuery,
    Card,
    CardContent,
    Stack,
    LinearProgress,
    Button,
} from '@mui/material';
import { motion, type Variants } from 'framer-motion';
import { LineChart, PieChart } from '@mui/x-charts';
import {
    Search,
    AlertTriangle,
    AlertCircle,
    RefreshCw,
    ChevronRight,
    Activity,
    X,
    Users,
    Link,
    Shield,
    Gauge,
    Info,
} from 'lucide-react';
import { DashboardCard } from '@/components/common/DashboardCard';
import { LogDetailOverlay } from '@/components/admin/LogDetailOverlay';
import adminService, { type SystemLog, type GetLogsParams } from '@/services/adminService';
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
    icon: Icon,
    color,
    subtitle,
}: {
    title: string;
    value: number | string;
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
                            fontSize: { xs: '1.5rem', sm: '2rem' },
                        }}
                    >
                        {typeof value === 'number' ? value.toLocaleString() : value}
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

// Mobile Log Card Component
function MobileLogCard({ log, onClick }: { log: SystemLog; onClick: () => void }) {
    const theme = useTheme();

    const getLevelColor = (level: string) => {
        switch (level) {
            case 'error': return theme.palette.error.main;
            case 'warn': return theme.palette.warning.main;
            case 'info': return theme.palette.info.main;
            default: return theme.palette.grey[500];
        }
    };

    return (
        <Card
            onClick={onClick}
            sx={{
                bgcolor: alpha(theme.palette.background.paper, 0.6),
                borderRadius: 3,
                border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                '&:hover': {
                    bgcolor: alpha(theme.palette.background.paper, 0.8),
                    transform: 'translateY(-1px)',
                    boxShadow: `0 4px 12px ${alpha(theme.palette.common.black, 0.1)}`,
                },
            }}
        >
            <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 1, mb: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                        <Chip
                            label={log.level}
                            size="small"
                            sx={{
                                bgcolor: alpha(getLevelColor(log.level), 0.1),
                                color: getLevelColor(log.level),
                                fontWeight: 600,
                                textTransform: 'uppercase',
                                fontSize: '10px',
                                height: 22,
                            }}
                        />
                        {log.statusCode && (
                            <Chip
                                label={log.statusCode}
                                size="small"
                                sx={{
                                    bgcolor: alpha(
                                        log.statusCode >= 500
                                            ? theme.palette.error.main
                                            : log.statusCode >= 400
                                              ? theme.palette.warning.main
                                              : theme.palette.success.main,
                                        0.1
                                    ),
                                    color:
                                        log.statusCode >= 500
                                            ? theme.palette.error.main
                                            : log.statusCode >= 400
                                              ? theme.palette.warning.main
                                              : theme.palette.success.main,
                                    fontSize: '10px',
                                    height: 22,
                                }}
                            />
                        )}
                        {log.method && (
                            <Chip label={log.method} size="small" variant="outlined" sx={{ fontSize: '10px', height: 22 }} />
                        )}
                    </Box>
                    <Typography variant="caption" color="text.secondary" sx={{ whiteSpace: 'nowrap', fontSize: '10px' }}>
                        {dayjs(log.timestamp).format('MMM D, HH:mm')}
                    </Typography>
                </Box>
                
                <Typography
                    variant="body2"
                    sx={{
                        fontWeight: 500,
                        mb: 0.5,
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                    }}
                >
                    {log.message}
                </Typography>
                
                {log.url && (
                    <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{
                            fontFamily: 'monospace',
                            fontSize: '10px',
                            display: 'block',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                        }}
                    >
                        {log.url}
                    </Typography>
                )}

                <Box
                    sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        mt: 1,
                        pt: 1,
                        borderTop: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                        color: 'text.secondary',
                    }}
                >
                    <Typography variant="caption" sx={{ mr: 0.5 }}>
                        Tap to view details
                    </Typography>
                    <ChevronRight size={14} />
                </Box>
            </CardContent>
        </Card>
    );
}

// Log Row Component
function LogRow({ log, onClick }: { log: SystemLog; onClick: () => void }) {
    const theme = useTheme();

    const getLevelColor = (level: string) => {
        switch (level) {
            case 'error': return theme.palette.error.main;
            case 'warn': return theme.palette.warning.main;
            case 'info': return theme.palette.info.main;
            default: return theme.palette.grey[500];
        }
    };

    return (
        <TableRow
            hover
            onClick={onClick}
            sx={{ 
                cursor: 'pointer',
                transition: 'background-color 0.15s ease',
                '&:hover': {
                    bgcolor: alpha(theme.palette.primary.main, 0.04),
                },
            }}
        >
            <TableCell sx={{ width: 40 }}>
                <Box
                    sx={{
                        width: 28,
                        height: 28,
                        borderRadius: '8px',
                        bgcolor: alpha(theme.palette.primary.main, 0.1),
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                    }}
                >
                    <ChevronRight size={14} color={theme.palette.primary.main} />
                </Box>
            </TableCell>
            <TableCell>
                <Chip
                    label={log.level}
                    size="small"
                    sx={{
                        bgcolor: alpha(getLevelColor(log.level), 0.1),
                        color: getLevelColor(log.level),
                        fontWeight: 600,
                        textTransform: 'uppercase',
                        fontSize: '10px',
                    }}
                />
            </TableCell>
            <TableCell>
                <Typography
                    variant="body2"
                    sx={{
                        maxWidth: 300,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                    }}
                >
                    {log.message}
                </Typography>
            </TableCell>
            <TableCell>
                <Typography variant="caption" color="text.secondary">
                    {dayjs(log.timestamp).format('MMM D, HH:mm:ss')}
                </Typography>
            </TableCell>
            <TableCell>
                {log.method && (
                    <Chip label={log.method} size="small" variant="outlined" sx={{ fontSize: '10px' }} />
                )}
            </TableCell>
            <TableCell>
                <Typography variant="caption" color="text.secondary" sx={{ maxWidth: 150, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {log.url || '-'}
                </Typography>
            </TableCell>
            <TableCell>
                {log.statusCode && (
                    <Chip
                        label={log.statusCode}
                        size="small"
                        sx={{
                            bgcolor: alpha(
                                log.statusCode >= 500
                                    ? theme.palette.error.main
                                    : log.statusCode >= 400
                                      ? theme.palette.warning.main
                                      : theme.palette.success.main,
                                0.1
                            ),
                            color:
                                log.statusCode >= 500
                                    ? theme.palette.error.main
                                    : log.statusCode >= 400
                                      ? theme.palette.warning.main
                                      : theme.palette.success.main,
                            fontSize: '11px',
                        }}
                    />
                )}
            </TableCell>
        </TableRow>
    );
}

export function AdministrationPage() {
    const theme = useTheme();
    const navigate = useNavigate();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

    // Filter state
    const [filters, setFilters] = useState<GetLogsParams>({
        page: 1,
        limit: 25,
        sortOrder: 'desc',
    });
    const [searchInput, setSearchInput] = useState('');
    const [selectedLog, setSelectedLog] = useState<SystemLog | null>(null);

    // Stats query
    const {
        data: stats,
        isLoading: statsLoading,
        refetch: refetchStats,
    } = useQuery({
        queryKey: ['admin', 'stats'],
        queryFn: () => adminService.getStats(7),
        refetchInterval: 60000, // Refresh every minute
    });

    // Filter options query
    const { data: filterOptions } = useQuery({
        queryKey: ['admin', 'filter-options'],
        queryFn: () => adminService.getFilterOptions(),
    });

    // Logs query
    const {
        data: logsData,
        isLoading: logsLoading,
        isFetching: logsFetching,
        refetch: refetchLogs,
    } = useQuery({
        queryKey: ['admin', 'logs', filters],
        queryFn: () => adminService.getLogs(filters),
        placeholderData: (previousData) => previousData,
    });

    // Debounced search effect
    useEffect(() => {
        const timer = setTimeout(() => {
            setFilters((prev) => {
                const newSearch = searchInput.trim() || undefined;
                if (prev.search === newSearch) return prev;
                return { ...prev, search: newSearch, page: 1 };
            });
        }, 400);
        return () => clearTimeout(timer);
    }, [searchInput]);

    // Handle clear search
    const handleClearSearch = useCallback(() => {
        setSearchInput('');
    }, []);

    // Handle filter change
    const handleFilterChange = useCallback((key: keyof GetLogsParams, value: any) => {
        setFilters((prev) => ({ ...prev, [key]: value || undefined, page: 1 }));
    }, []);

    // Handle page change
    const handlePageChange = useCallback((_: unknown, newPage: number) => {
        setFilters((prev) => ({ ...prev, page: newPage + 1 }));
    }, []);

    // Handle rows per page change
    const handleRowsPerPageChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
        setFilters((prev) => ({ ...prev, limit: parseInt(event.target.value, 10), page: 1 }));
    }, []);

    // Refresh all data
    const handleRefresh = useCallback(() => {
        refetchStats();
        refetchLogs();
    }, [refetchStats, refetchLogs]);

    // Chart data preparation
    const lineChartData = useMemo(() => {
        if (!stats?.byHour) return { xAxis: [], errors: [], warnings: [], info: [] };
        
        return {
            xAxis: stats.byHour.map((h) => dayjs(h.hour).format('HH:mm')),
            errors: stats.byHour.map((h) => h.errors),
            warnings: stats.byHour.map((h) => h.warnings),
            info: stats.byHour.map((h) => h.info || 0),
        };
    }, [stats?.byHour]);

    const pieChartData = useMemo(() => {
        if (!stats) return [];
        return [
            { id: 0, value: stats.errorCount, label: 'Errors', color: theme.palette.error.main },
            { id: 1, value: stats.warnCount, label: 'Warnings', color: theme.palette.warning.main },
            { id: 2, value: stats.infoCount || 0, label: 'Info', color: theme.palette.info.main },
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
                                <Shield size={isMobile ? 20 : 24} color={theme.palette.primary.main} />
                            </Box>
                            <Box>
                                <Typography variant={isMobile ? 'h6' : 'h5'} sx={{ fontWeight: 700 }}>
                                    System Administration
                                </Typography>
                                <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '12px', sm: '14px' } }}>
                                    Monitor system logs and performance
                                </Typography>
                            </Box>
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Tooltip title="Refresh data">
                                <IconButton onClick={handleRefresh} sx={{ bgcolor: alpha(theme.palette.primary.main, 0.1) }}>
                                    <RefreshCw size={isMobile ? 18 : 20} />
                                </IconButton>
                            </Tooltip>
                            <Button
                                variant="contained"
                                startIcon={<Gauge size={18} />}
                                onClick={() => navigate('/administration/performance')}
                                sx={{
                                    borderRadius: 2,
                                    textTransform: 'none',
                                    fontWeight: 600,
                                    px: { xs: 1.5, sm: 2 },
                                    fontSize: { xs: '12px', sm: '14px' },
                                }}
                            >
                                {isMobile ? 'Performance' : 'Performance Analytics'}
                            </Button>
                        </Box>
                    </Box>
                </motion.div>

                {/* Stats Cards */}
                <motion.div variants={itemVariants}>
                    <Grid container spacing={2}>
                        <Grid size={{ xs: 6, sm: 3 }}>
                            {statsLoading ? (
                                <Skeleton variant="rounded" height={120} sx={{ borderRadius: '24px' }} />
                            ) : (
                                <StatCard
                                    title="Total Logs (7d)"
                                    value={stats?.totalLogs || 0}
                                    icon={Activity}
                                    color={theme.palette.primary.main}
                                />
                            )}
                        </Grid>
                        <Grid size={{ xs: 6, sm: 3 }}>
                            {statsLoading ? (
                                <Skeleton variant="rounded" height={120} sx={{ borderRadius: '24px' }} />
                            ) : (
                                <StatCard
                                    title="Info (24h)"
                                    value={stats?.last24Hours.info || 0}
                                    icon={Info}
                                    color={theme.palette.info.main}
                                />
                            )}
                        </Grid>
                        <Grid size={{ xs: 6, sm: 3 }}>
                            {statsLoading ? (
                                <Skeleton variant="rounded" height={120} sx={{ borderRadius: '24px' }} />
                            ) : (
                                <StatCard
                                    title="Warnings (24h)"
                                    value={stats?.last24Hours.warnings || 0}
                                    icon={AlertTriangle}
                                    color={theme.palette.warning.main}
                                />
                            )}
                        </Grid>
                        <Grid size={{ xs: 6, sm: 3 }}>
                            {statsLoading ? (
                                <Skeleton variant="rounded" height={120} sx={{ borderRadius: '24px' }} />
                            ) : (
                                <StatCard
                                    title="Errors (24h)"
                                    value={stats?.last24Hours.errors || 0}
                                    icon={AlertCircle}
                                    color={theme.palette.error.main}
                                />
                            )}
                        </Grid>
                    </Grid>
                </motion.div>

                {/* Charts Row */}
                <motion.div variants={itemVariants}>
                    <Grid container spacing={{ xs: 2, md: 3 }}>
                        {/* Line Chart - Logs Over Time */}
                        <Grid size={{ xs: 12, lg: 8 }}>
                            <DashboardCard>
                                <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, fontSize: { xs: '1rem', sm: '1.25rem' } }}>
                                    Logs Over Time (24h)
                                </Typography>
                                {statsLoading ? (
                                    <Skeleton variant="rounded" height={isMobile ? 200 : 300} />
                                ) : (
                                    <Box sx={{ width: '100%', height: { xs: 200, sm: 300 }, mx: -1 }}>
                                        <LineChart
                                            xAxis={[
                                                {
                                                    data: lineChartData.xAxis,
                                                    scaleType: 'point',
                                                    tickLabelStyle: {
                                                        fill: theme.palette.text.secondary,
                                                        fontSize: isMobile ? 9 : 11,
                                                    },
                                                },
                                            ]}
                                            series={[
                                                {
                                                    data: lineChartData.info,
                                                    label: 'Info',
                                                    color: theme.palette.info.main,
                                                    curve: 'monotoneX',
                                                    area: true,
                                                },
                                                {
                                                    data: lineChartData.errors,
                                                    label: 'Errors',
                                                    color: theme.palette.error.main,
                                                    curve: 'monotoneX',
                                                    area: true,
                                                },
                                                {
                                                    data: lineChartData.warnings,
                                                    label: 'Warnings',
                                                    color: theme.palette.warning.main,
                                                    curve: 'monotoneX',
                                                    area: true,
                                                },
                                            ]}
                                            sx={{
                                                '.MuiLineElement-root': {
                                                    strokeWidth: 2,
                                                },
                                                '.MuiAreaElement-root': {
                                                    fillOpacity: 0.1,
                                                },
                                                '.MuiChartsAxis-line': {
                                                    stroke: alpha(theme.palette.divider, 0.2),
                                                },
                                                '.MuiChartsAxis-tick': {
                                                    stroke: alpha(theme.palette.divider, 0.2),
                                                },
                                            }}
                                            margin={{ left: isMobile ? 40 : 50, right: isMobile ? 10 : 20, top: 20, bottom: isMobile ? 30 : 40 }}
                                        />
                                    </Box>
                                )}
                            </DashboardCard>
                        </Grid>

                        {/* Pie Chart - Log Distribution */}
                        <Grid size={{ xs: 12, lg: 4 }}>
                            <DashboardCard>
                                <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, fontSize: { xs: '1rem', sm: '1.25rem' } }}>
                                    Log Distribution
                                </Typography>
                                {statsLoading ? (
                                    <Skeleton variant="circular" width={isMobile ? 150 : 200} height={isMobile ? 150 : 200} sx={{ mx: 'auto' }} />
                                ) : (
                                    <Box sx={{ width: '100%', height: { xs: 200, sm: 250 }, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <PieChart
                                            series={[
                                                {
                                                    data: pieChartData,
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

                {/* Top Endpoints & Users */}
                <motion.div variants={itemVariants}>
                    <Grid container spacing={{ xs: 2, md: 3 }}>
                        <Grid size={{ xs: 12, md: 6 }}>
                            <DashboardCard>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                                    <Link size={isMobile ? 16 : 18} color={theme.palette.primary.main} />
                                    <Typography variant="h6" sx={{ fontWeight: 600, fontSize: { xs: '0.95rem', sm: '1.25rem' } }}>
                                        Top Error Endpoints
                                    </Typography>
                                </Box>
                                {statsLoading ? (
                                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                                        {[1, 2, 3, 4, 5].map((i) => (
                                            <Skeleton key={i} variant="rounded" height={40} />
                                        ))}
                                    </Box>
                                ) : (
                                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                                        {stats?.topUrls.slice(0, isMobile ? 3 : 5).map((item, idx) => (
                                            <Box
                                                key={item.url}
                                                sx={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'space-between',
                                                    p: { xs: 1, sm: 1.5 },
                                                    borderRadius: 2,
                                                    bgcolor: alpha(theme.palette.background.default, 0.5),
                                                    gap: 1,
                                                }}
                                            >
                                                <Typography 
                                                    variant="body2" 
                                                    sx={{ 
                                                        fontFamily: 'monospace', 
                                                        fontSize: { xs: '10px', sm: '12px' },
                                                        overflow: 'hidden',
                                                        textOverflow: 'ellipsis',
                                                        whiteSpace: 'nowrap',
                                                        flex: 1,
                                                        minWidth: 0,
                                                    }}
                                                >
                                                    {idx + 1}. {item.url}
                                                </Typography>
                                                <Chip label={item.count} size="small" color="error" sx={{ height: 22, fontSize: '11px' }} />
                                            </Box>
                                        )) || (
                                            <Typography variant="body2" color="text.secondary">
                                                No data available
                                            </Typography>
                                        )}
                                    </Box>
                                )}
                            </DashboardCard>
                        </Grid>
                        <Grid size={{ xs: 12, md: 6 }}>
                            <DashboardCard>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                                    <Users size={isMobile ? 16 : 18} color={theme.palette.primary.main} />
                                    <Typography variant="h6" sx={{ fontWeight: 600, fontSize: { xs: '0.95rem', sm: '1.25rem' } }}>
                                        Users with Most Errors
                                    </Typography>
                                </Box>
                                {statsLoading ? (
                                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                                        {[1, 2, 3, 4, 5].map((i) => (
                                            <Skeleton key={i} variant="rounded" height={40} />
                                        ))}
                                    </Box>
                                ) : (
                                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                                        {stats?.topUsers.slice(0, isMobile ? 3 : 5).map((item, idx) => (
                                            <Box
                                                key={item.userId}
                                                sx={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'space-between',
                                                    p: { xs: 1, sm: 1.5 },
                                                    borderRadius: 2,
                                                    bgcolor: alpha(theme.palette.background.default, 0.5),
                                                    gap: 1,
                                                }}
                                            >
                                                <Typography 
                                                    variant="body2" 
                                                    sx={{ 
                                                        fontFamily: 'monospace', 
                                                        fontSize: { xs: '10px', sm: '12px' },
                                                        overflow: 'hidden',
                                                        textOverflow: 'ellipsis',
                                                        whiteSpace: 'nowrap',
                                                        flex: 1,
                                                        minWidth: 0,
                                                    }}
                                                >
                                                    {idx + 1}. {item.userId}
                                                </Typography>
                                                <Chip label={item.count} size="small" color="warning" sx={{ height: 22, fontSize: '11px' }} />
                                            </Box>
                                        )) || (
                                            <Typography variant="body2" color="text.secondary">
                                                No data available
                                            </Typography>
                                        )}
                                    </Box>
                                )}
                            </DashboardCard>
                        </Grid>
                    </Grid>
                </motion.div>

                {/* Logs Table */}
                <motion.div variants={itemVariants}>
                    <DashboardCard noPadding>
                        <Box sx={{ p: { xs: 1.5, sm: 2.5 }, pb: 0 }}>
                            <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, fontSize: { xs: '1rem', sm: '1.25rem' } }}>
                                System Logs
                            </Typography>

                            {/* Filters */}
                            <Grid container spacing={{ xs: 1, sm: 2 }} sx={{ mb: 2 }}>
                                <Grid size={{ xs: 12, sm: 4 }}>
                                    <TextField
                                        fullWidth
                                        size="small"
                                        placeholder="Search logs..."
                                        value={searchInput}
                                        onChange={(e) => setSearchInput(e.target.value)}
                                        InputProps={{
                                            startAdornment: (
                                                <InputAdornment position="start">
                                                    <Search size={isMobile ? 16 : 18} color={theme.palette.text.secondary} />
                                                </InputAdornment>
                                            ),
                                            endAdornment: searchInput ? (
                                                <InputAdornment position="end">
                                                    <IconButton
                                                        size="small"
                                                        onClick={handleClearSearch}
                                                        sx={{ p: 0.5 }}
                                                    >
                                                        <X size={16} />
                                                    </IconButton>
                                                </InputAdornment>
                                            ) : null,
                                            sx: { fontSize: { xs: '13px', sm: '14px' } },
                                        }}
                                    />
                                </Grid>
                                <Grid size={{ xs: 6, sm: 2 }}>
                                    <TextField
                                        fullWidth
                                        size="small"
                                        select
                                        label="Level"
                                        value={filters.level || ''}
                                        onChange={(e) => handleFilterChange('level', e.target.value)}
                                        sx={{ '& .MuiInputBase-root': { fontSize: { xs: '13px', sm: '14px' } } }}
                                    >
                                        <MenuItem value="">All</MenuItem>
                                        <MenuItem value="info">Info</MenuItem>
                                        <MenuItem value="warn">Warning</MenuItem>
                                        <MenuItem value="error">Error</MenuItem>
                                    </TextField>
                                </Grid>
                                <Grid size={{ xs: 6, sm: 2 }}>
                                    <TextField
                                        fullWidth
                                        size="small"
                                        select
                                        label="Method"
                                        value={filters.method || ''}
                                        onChange={(e) => handleFilterChange('method', e.target.value)}
                                        sx={{ '& .MuiInputBase-root': { fontSize: { xs: '13px', sm: '14px' } } }}
                                    >
                                        <MenuItem value="">All</MenuItem>
                                        {filterOptions?.methods.map((m) => (
                                            <MenuItem key={m} value={m}>
                                                {m}
                                            </MenuItem>
                                        ))}
                                    </TextField>
                                </Grid>
                                <Grid size={{ xs: 6, sm: 2 }}>
                                    <TextField
                                        fullWidth
                                        size="small"
                                        select
                                        label="Status"
                                        value={filters.statusCode || ''}
                                        onChange={(e) => handleFilterChange('statusCode', e.target.value)}
                                        sx={{ '& .MuiInputBase-root': { fontSize: { xs: '13px', sm: '14px' } } }}
                                    >
                                        <MenuItem value="">All</MenuItem>
                                        {filterOptions?.statusCodes.map((s) => (
                                            <MenuItem key={s} value={s}>
                                                {s}
                                            </MenuItem>
                                        ))}
                                    </TextField>
                                </Grid>
                                <Grid size={{ xs: 6, sm: 2 }}>
                                    <TextField
                                        fullWidth
                                        size="small"
                                        select
                                        label="Sort"
                                        value={filters.sortOrder || 'desc'}
                                        onChange={(e) => handleFilterChange('sortOrder', e.target.value)}
                                        sx={{ '& .MuiInputBase-root': { fontSize: { xs: '13px', sm: '14px' } } }}
                                    >
                                        <MenuItem value="desc">Newest First</MenuItem>
                                        <MenuItem value="asc">Oldest First</MenuItem>
                                    </TextField>
                                </Grid>
                            </Grid>
                        </Box>

                        {/* Loading Indicator */}
                        <Box sx={{ height: 4, mb: 1 }}>
                            {logsFetching && (
                                <LinearProgress 
                                    sx={{ 
                                        borderRadius: 1,
                                        '& .MuiLinearProgress-bar': {
                                            borderRadius: 1,
                                        },
                                    }} 
                                />
                            )}
                        </Box>

                        {/* Mobile Cards / Desktop Table */}
                        {isMobile ? (
                            <Box sx={{ px: 1.5, pb: 1 }}>
                                {logsLoading ? (
                                    <Stack spacing={1.5}>
                                        {[...Array(5)].map((_, i) => (
                                            <Skeleton key={i} variant="rounded" height={120} sx={{ borderRadius: 2 }} />
                                        ))}
                                    </Stack>
                                ) : logsData?.items.length === 0 ? (
                                    <Box sx={{ py: 4, textAlign: 'center' }}>
                                        <Typography color="text.secondary">No logs found</Typography>
                                    </Box>
                                ) : (
                                    <Stack spacing={1.5}>
                                        {logsData?.items.map((log) => (
                                            <MobileLogCard key={log._id} log={log} onClick={() => setSelectedLog(log)} />
                                        ))}
                                    </Stack>
                                )}
                            </Box>
                        ) : (
                            <TableContainer>
                                <Table size="small">
                                    <TableHead>
                                        <TableRow>
                                            <TableCell sx={{ width: 40 }} />
                                            <TableCell sx={{ fontWeight: 600 }}>Level</TableCell>
                                            <TableCell sx={{ fontWeight: 600 }}>Message</TableCell>
                                            <TableCell sx={{ fontWeight: 600 }}>Time</TableCell>
                                            <TableCell sx={{ fontWeight: 600 }}>Method</TableCell>
                                            <TableCell sx={{ fontWeight: 600 }}>URL</TableCell>
                                            <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {logsLoading ? (
                                            [...Array(10)].map((_, i) => (
                                                <TableRow key={i}>
                                                    <TableCell colSpan={7}>
                                                        <Skeleton variant="text" />
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        ) : logsData?.items.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                                                    <Typography color="text.secondary">No logs found</Typography>
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            logsData?.items.map((log) => <LogRow key={log._id} log={log} onClick={() => setSelectedLog(log)} />)
                                        )}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        )}

                        {/* Pagination */}
                        <TablePagination
                            component="div"
                            count={logsData?.total || 0}
                            page={(filters.page || 1) - 1}
                            onPageChange={handlePageChange}
                            rowsPerPage={filters.limit || 25}
                            onRowsPerPageChange={handleRowsPerPageChange}
                            rowsPerPageOptions={isMobile ? [10, 25] : [10, 25, 50, 100]}
                            sx={{
                                '& .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows': {
                                    fontSize: { xs: '12px', sm: '14px' },
                                },
                                '& .MuiTablePagination-select': {
                                    fontSize: { xs: '12px', sm: '14px' },
                                },
                            }}
                        />
                    </DashboardCard>
                </motion.div>
            </Box>

            {/* Log Detail Overlay */}
            <LogDetailOverlay
                log={selectedLog}
                open={selectedLog !== null}
                onClose={() => setSelectedLog(null)}
            />
        </motion.div>
    );
}
