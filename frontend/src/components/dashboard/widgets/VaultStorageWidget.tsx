import {
    Storage as StorageIcon,
    OpenInNew as ExternalLinkIcon
} from '@mui/icons-material';
import {
    Box,
    Typography,
    Button,
    alpha,
    useTheme,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { usePreferenceStore } from '@/stores/preferenceStore';
import { useSessionStore } from '@/stores/sessionStore';
import { motion } from 'framer-motion';
import { DashboardCard } from '@/components/common/DashboardCard';

export function VaultStorageWidget() {
    const theme = useTheme();
    const navigate = useNavigate();
    const isSidebarCollapsed = usePreferenceStore((state) => state.isSidebarCollapsed);
    const {
        user,
        fetchStorageStats
    } = useSessionStore();

    // Auto-fetch storage stats on mount
    useEffect(() => {
        fetchStorageStats();
    }, [fetchStorageStats]);



    // Storage Constants
    const FREE_TIER_LIMIT = 5 * 1024 * 1024 * 1024; // 5GB
    const totalUsedBytes = user?.totalStorageUsed || 0;
    const usagePercent = Math.min(100, Math.round((totalUsedBytes / FREE_TIER_LIMIT) * 100));

    const formatBytes = (bytes: number) => {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };
    const usedFormatted = formatBytes(totalUsedBytes);

    const statusColor = usagePercent > 90
        ? theme.palette.error.main
        : usagePercent > 70
            ? theme.palette.warning.main
            : theme.palette.primary.main;

    return (
        <DashboardCard
            sx={{
                borderRadius: '24px',
                boxShadow: `0 8px 32px -8px ${alpha('#000', 0.5)}`,
                transition: 'all 0.4s ease',
                position: 'relative',
                transform: 'translateZ(0)',
                willChange: 'transform, opacity',

                '&::before': {
                    content: '""',
                    position: 'absolute',
                    top: 0,
                    right: 0,
                    width: '120px',
                    height: '120px',
                    background: `radial-gradient(circle at 100% 0%, ${alpha(statusColor, 0.15)} 0% , transparent 70%)`,
                    pointerEvents: 'none',
                    display: { xs: 'none', md: 'block' }
                },
                '&:hover': {
                    border: `1px solid ${alpha(statusColor, 0.3)}`,
                    boxShadow: `0 12px 48px -12px ${alpha(statusColor, 0.2)}`,
                    transform: 'translateY(-2px)'
                }
            }}
        >
            <Box sx={{
                flex: 1,
                display: 'flex',
                flexDirection: { xs: 'column', md: 'row' },
                alignItems: { xs: 'center', md: 'center' },
                justifyContent: 'space-between',
                gap: { xs: 3, md: 0, lg: isSidebarCollapsed ? 2 : 1, xl: 2 },
                position: 'relative',
                zIndex: 1
            }}>
                {/* Left Side: Info & Button */}
                <Box sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: { xs: 'center', md: 'flex-start' },
                    justifyContent: 'center',
                    height: '100%',
                    flex: 1,
                    textAlign: { xs: 'center', md: 'left' }
                }}>
                    <Box sx={{ mb: 3 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                            <Typography variant="subtitle2" sx={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 1.5,
                                fontWeight: 800,
                                color: 'text.primary',
                                letterSpacing: '0.02em',
                                fontSize: { lg: isSidebarCollapsed ? '0.875rem' : '0.75rem', xl: '0.875rem' }
                            }}>
                                <StorageIcon sx={{ fontSize: { xs: 20, lg: isSidebarCollapsed ? 20 : 16, xl: 20 }, color: statusColor }} />
                                VAULT STORAGE
                            </Typography>
                        </Box>

                        <Typography variant="caption" sx={{
                            color: 'text.secondary',
                            fontWeight: 600,
                            fontSize: { xs: '0.75rem', lg: isSidebarCollapsed ? '0.75rem' : '0.65rem', xl: '0.75rem' },
                            opacity: 0.9,
                            display: 'block'
                        }}>
                            {usedFormatted} used of 5.0 GB
                        </Typography>
                    </Box>

                    {/* Subtle Syncing Indicator (Absolute positioned to prevent layout shift) */}


                    <Button
                        variant="contained"
                        onClick={() => navigate('/dashboard/files')}
                        disableElevation
                        size="small"
                        endIcon={<ExternalLinkIcon sx={{ fontSize: 14 }} />}
                        sx={{
                            borderRadius: '12px',
                            textTransform: 'none',
                            fontWeight: 800,
                            fontSize: { xs: '0.8rem', lg: isSidebarCollapsed ? '0.8rem' : '0.7rem', xl: '0.8rem' },
                            px: { xs: 3, lg: isSidebarCollapsed ? 2.5 : 1.5, xl: 3 },
                            py: { xs: 0.8, lg: isSidebarCollapsed ? 0.8 : 0.5, xl: 0.8 },
                            bgcolor: alpha(theme.palette.text.primary, 0.08),
                            color: theme.palette.text.primary,
                            border: `1px solid ${alpha(theme.palette.text.primary, 0.15)}`,
                            display: { xs: 'none', md: 'inline-flex' },
                            '&:hover': {
                                bgcolor: alpha(theme.palette.text.primary, 0.12),
                                border: `1px solid ${alpha(theme.palette.text.primary, 0.25)}`,
                                transform: 'translateX(4px)',
                            },
                            transition: 'all 0.3s ease',
                        }}
                    >
                        Manage Files
                    </Button>
                </Box>

                {/* Right Side: Gauge */}
                <Box sx={{
                    position: 'relative',
                    width: { xs: 180, lg: isSidebarCollapsed ? 180 : 150, xl: 180 },
                    height: { xs: 110, lg: isSidebarCollapsed ? 110 : 90, xl: 110 },
                    flexShrink: 0,
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'flex-end',
                    mb: { xs: 1, md: 0 }
                }}>
                    <svg width="100%" height="100%" viewBox="0 0 180 110">
                        <defs>
                            <linearGradient id="storage-gauge-gradient" x1="0" y1="0" x2="1" y2="0">
                                <stop offset="0%" stopColor={statusColor} stopOpacity={0.7} />
                                <stop offset="50%" stopColor={statusColor} stopOpacity={1} />
                                <stop offset="100%" stopColor={statusColor} stopOpacity={0.7} />
                            </linearGradient>
                            <filter id="storage-gauge-glow">
                                <feGaussianBlur stdDeviation="3" result="coloredBlur" />
                                <feMerge>
                                    <feMergeNode in="coloredBlur" />
                                    <feMergeNode in="SourceGraphic" />
                                </feMerge>
                            </filter>
                        </defs>
                        {/* Background Arc */}
                        <path
                            d="M 15 100 A 75 75 0 0 1 165 100"
                            fill="none"
                            stroke={alpha(theme.palette.divider, 0.12)}
                            strokeWidth="14"
                            strokeLinecap="round"
                        />
                        {/* Progress Arc */}
                        <motion.path
                            d="M 15 100 A 75 75 0 0 1 165 100"
                            fill="none"
                            stroke="url(#storage-gauge-gradient)"
                            strokeWidth="14"
                            strokeLinecap="round"
                            filter="url(#storage-gauge-glow)"
                            initial={{ pathLength: 0 }}
                            animate={{ pathLength: usagePercent / 100 }}
                            transition={{ duration: 2, ease: [0.34, 1.56, 0.64, 1] }}
                        />
                    </svg>
                    <Box sx={{
                        position: 'absolute',
                        bottom: 1,
                        textAlign: 'center',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center'
                    }}>
                        <Typography variant="h3" sx={{
                            fontWeight: 900,
                            lineHeight: 1,
                            letterSpacing: '-0.04em',
                            fontSize: { xs: '2.2rem', lg: isSidebarCollapsed ? '2.2rem' : '1.8rem', xl: '2.2rem' },
                            color: theme.palette.text.primary,
                            mb: 0.5,
                            textShadow: `0 0 20px ${alpha(statusColor, 0.4)}`
                        }}>
                            {usagePercent}%
                        </Typography>
                        <Typography variant="caption" sx={{
                            color: 'text.secondary',
                            fontWeight: 800,
                            opacity: 0.8,
                            fontSize: '0.6rem',
                            letterSpacing: '0.1em',
                            textTransform: 'uppercase'
                        }}>
                            CAPACITY
                        </Typography>
                    </Box>
                </Box>
            </Box>


        </DashboardCard>
    );
}
