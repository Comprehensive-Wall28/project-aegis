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

                {/* Right Side: Straight Progress Bar */}
                <Box sx={{
                    flex: 1.2,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    gap: 1.5,
                    width: '100%',
                    maxWidth: { xs: '100%', md: '280px' },
                    position: 'relative'
                }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', mb: 0.5 }}>
                        <Typography variant="h4" sx={{
                            fontWeight: 900,
                            fontSize: { xs: '1.75rem', md: '2rem' },
                            lineHeight: 1,
                            color: 'text.primary',
                            textShadow: `0 0 20px ${alpha(statusColor, 0.3)}`
                        }}>
                            {usagePercent}%
                        </Typography>
                        <Typography variant="caption" sx={{
                            color: 'text.secondary',
                            fontWeight: 800,
                            letterSpacing: '0.1em',
                            fontSize: '0.65rem'
                        }}>
                            USED CAPACITY
                        </Typography>
                    </Box>

                    {/* Progress Bar Container */}
                    <Box sx={{
                        height: 12,
                        width: '100%',
                        bgcolor: alpha(theme.palette.divider, 0.08),
                        borderRadius: '6px',
                        position: 'relative',
                        overflow: 'hidden',
                        border: `1px solid ${alpha(theme.palette.divider, 0.1)}`
                    }}>
                        {/* Animated Fill */}
                        <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${usagePercent}%` }}
                            transition={{ duration: 1.5, ease: [0.34, 1.56, 0.64, 1] }}
                            style={{
                                height: '100%',
                                background: `linear-gradient(90deg, ${alpha(statusColor, 0.8)} 0%, ${statusColor} 100%)`,
                                boxShadow: `0 0 15px ${alpha(statusColor, 0.5)}`,
                                borderRadius: '6px'
                            }}
                        />
                    </Box>

                    {/* Desktop Manage Button (Moved inside right flex for better balance on desktop) */}
                    <Button
                        variant="contained"
                        onClick={() => navigate('/dashboard/files')}
                        disableElevation
                        size="small"
                        endIcon={<ExternalLinkIcon sx={{ fontSize: 14 }} />}
                        sx={{
                            mt: 2,
                            borderRadius: '10px',
                            textTransform: 'none',
                            fontWeight: 800,
                            fontSize: '0.75rem',
                            py: 0.8,
                            bgcolor: alpha(theme.palette.text.primary, 0.05),
                            color: theme.palette.text.primary,
                            border: `1px solid ${alpha(theme.palette.text.primary, 0.1)}`,
                            display: { xs: 'inline-flex', md: 'none' }, // Only show on mobile here
                            width: 'fit-content',
                            alignSelf: 'center',
                            '&:hover': {
                                bgcolor: alpha(theme.palette.text.primary, 0.1),
                                border: `1px solid ${alpha(theme.palette.text.primary, 0.2)}`,
                            }
                        }}
                    >
                        Manage Files
                    </Button>
                </Box>
            </Box>


        </DashboardCard>
    );
}
