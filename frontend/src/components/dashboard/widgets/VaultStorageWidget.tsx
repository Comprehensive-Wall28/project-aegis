import {
    Storage as StorageIcon
} from '@mui/icons-material';
import {
    Box,
    Typography,
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

    const remainingBytes = Math.max(0, FREE_TIER_LIMIT - totalUsedBytes);
    const remainingFormatted = formatBytes(remainingBytes);

    return (
        <DashboardCard
            onClick={() => navigate('/dashboard/files')}
            sx={{
                cursor: 'pointer',
                boxShadow: `0 8px 32px -8px ${alpha('#000', 0.5)}`,
                transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                position: 'relative',
                transform: 'translateZ(0)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                py: { xs: 4, md: 5 }, // Increased vertical padding to restore height
                px: { xs: 2.5, md: 3 },

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
                    border: `1px solid ${alpha(statusColor, 0.5)}`,
                    boxShadow: `0 12px 48px -12px ${alpha(statusColor, 0.3)}`,
                    transform: 'translateY(-4px)',
                },
                '&:active': {
                    transform: 'translateY(-2px) scale(0.98)',
                }
            }}
        >
            <Box sx={{
                display: 'flex',
                gap: { xs: 5, md: 4, lg: isSidebarCollapsed ? 5 : 4 }, // Increased gap to fill vertical space
                flexDirection: { xs: 'column', md: 'row' },
                alignItems: 'center',
                justifyContent: 'space-between',
                position: 'relative',
                zIndex: 1
            }}>
                {/* Left Side: Info */}
                <Box sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: { xs: 'center', md: 'flex-start' },
                    textAlign: { xs: 'center', md: 'left' },
                    flex: { xs: 'none', md: 1 }
                }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                        <StorageIcon sx={{ fontSize: { xs: 20, md: 18 }, color: statusColor }} />
                        <Typography variant="subtitle2" sx={{
                            fontWeight: 800,
                            color: 'text.primary',
                            letterSpacing: '0.05em',
                            fontSize: { xs: '0.75rem', md: '0.7rem' },
                            textTransform: 'uppercase'
                        }}>
                            Vault Storage
                        </Typography>
                    </Box>
                    <Typography variant="body2" sx={{
                        fontWeight: 700,
                        color: 'text.primary',
                        fontSize: { xs: '0.9rem', md: '0.85rem' },
                        mb: 0.5
                    }}>
                        {usedFormatted}
                    </Typography>
                    <Typography variant="caption" sx={{
                        color: 'text.secondary',
                        fontWeight: 600,
                        fontSize: '0.65rem',
                        opacity: 0.8
                    }}>
                        {remainingFormatted} remaining
                    </Typography>
                </Box>

                {/* Right Side: Progress */}
                <Box sx={{
                    width: { xs: '100%', md: isSidebarCollapsed ? 180 : 150, xl: 180 },
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 1
                }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', mb: 0.5 }}>
                        <Typography variant="h4" sx={{
                            fontWeight: 900,
                            fontSize: { xs: '2rem', md: '1.75rem' },
                            lineHeight: 1,
                            color: 'text.primary',
                            textShadow: `0 0 20px ${alpha(statusColor, 0.3)}`
                        }}>
                            {usagePercent}%
                        </Typography>
                        <Typography variant="caption" sx={{
                            color: 'text.secondary',
                            fontWeight: 800,
                            letterSpacing: '0.05em',
                            fontSize: '0.6rem'
                        }}>
                            CAPACITY
                        </Typography>
                    </Box>

                    {/* Compact Straight Progress Bar */}
                    <Box sx={{
                        height: 10,
                        width: '100%',
                        bgcolor: alpha(theme.palette.divider, 0.1),
                        borderRadius: '5px',
                        overflow: 'hidden',
                        border: `1px solid ${alpha(theme.palette.divider, 0.05)}`
                    }}>
                        <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${usagePercent}%` }}
                            transition={{ duration: 1.5, ease: [0.34, 1.56, 0.64, 1] }}
                            style={{
                                height: '100%',
                                background: `linear-gradient(90deg, ${alpha(statusColor, 0.7)} 0%, ${statusColor} 100%)`,
                                borderRadius: '5px',
                                position: 'relative'
                            }}
                        />
                    </Box>

                    <Typography variant="caption" sx={{
                        color: statusColor,
                        fontWeight: 800,
                        fontSize: '0.6rem',
                        textAlign: 'right',
                        letterSpacing: '0.05em'
                    }}>
                        {usagePercent > 90 ? 'REFILL REQUIRED' : usagePercent > 70 ? 'NEAR LIMIT' : 'SYSTEM OPTIMAL'}
                    </Typography>
                </Box>
            </Box>

            <style>{`
                @keyframes pulse {
                    0% { transform: scale(0.95); opacity: 0.8; }
                    50% { transform: scale(1.1); opacity: 1; }
                    100% { transform: scale(0.95); opacity: 0.8; }
                }
            `}</style>
        </DashboardCard>
    );
}
