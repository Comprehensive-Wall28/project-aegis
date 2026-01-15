import {
    Shield as ShieldIcon,
    CheckCircle as CheckCircleIcon,
    Report as AlertCircleIcon,
    Insights as ActivityIcon
} from '@mui/icons-material';
import {
    Box,
    Typography,
    alpha,
    useTheme,
    CircularProgress
} from '@mui/material';
import { useSessionStore } from '@/stores/sessionStore';
import { motion } from 'framer-motion';

export function SystemStatusBar() {
    const pqcEngineStatus = useSessionStore(state => state.pqcEngineStatus);
    const cryptoStatus = useSessionStore(state => state.cryptoStatus);

    const theme = useTheme();

    const getStatusConfig = () => {
        // Higher priority for cryptographic operations
        if (cryptoStatus !== 'idle') {
            const isDone = cryptoStatus === 'done';
            const busyColor = isDone ? theme.palette.success.main : '#c084fc';
            return {
                icon: isDone ? <CheckCircleIcon sx={{ fontSize: 14 }} /> : <CircularProgress size={12} sx={{ color: busyColor }} />,
                text: isDone ? 'Done!' : cryptoStatus.charAt(0).toUpperCase() + cryptoStatus.slice(1) + '...',
                color: busyColor,
                bgcolor: alpha(busyColor, 0.15),
                dotColor: busyColor,
                glow: isDone
            };
        }

        switch (pqcEngineStatus) {
            case 'operational':
                return {
                    icon: <CheckCircleIcon sx={{ fontSize: 14 }} />,
                    text: 'Operational',
                    color: theme.palette.info.main,
                    bgcolor: alpha(theme.palette.info.main, 0.1),
                    dotColor: theme.palette.info.main
                };
            case 'initializing':
                return {
                    icon: <CircularProgress size={12} color="inherit" />,
                    text: 'Initializing...',
                    color: theme.palette.warning.main,
                    bgcolor: alpha(theme.palette.warning.main, 0.1),
                    dotColor: theme.palette.warning.main
                };
            case 'error':
                return {
                    icon: <AlertCircleIcon sx={{ fontSize: 14 }} />,
                    text: 'Error',
                    color: theme.palette.error.main,
                    bgcolor: alpha(theme.palette.error.main, 0.1),
                    dotColor: theme.palette.error.main
                };
            default:
                return {
                    icon: <ActivityIcon sx={{ fontSize: 14 }} />,
                    text: 'Unknown',
                    color: theme.palette.text.secondary,
                    bgcolor: alpha(theme.palette.text.secondary, 0.1),
                    dotColor: theme.palette.text.secondary
                };
        }
    };

    const status = getStatusConfig();
    const isOperational = pqcEngineStatus === 'operational';
    const isBusy = cryptoStatus !== 'idle' && cryptoStatus !== 'done';
    const isFinished = cryptoStatus === 'done';

    return (
        <Box
            sx={{
                minHeight: { xs: 'auto', sm: 40 },
                display: 'flex',
                flexDirection: { xs: 'column', sm: 'row' },
                alignItems: 'center',
                justifyContent: { xs: 'center', sm: 'space-between' },
                px: { xs: 2, sm: 3 },
                py: { xs: 1, sm: 0 },
                gap: { xs: 1, sm: 0 },
                bgcolor: 'transparent'
            }}
        >
            {/* Left: System Label - Hidden on mobile */}
            <Box sx={{ display: { xs: 'none', sm: 'flex' }, alignItems: 'center', gap: 1, color: 'text.secondary' }}>
                <Typography variant="caption" sx={{ fontSize: '11px', fontWeight: 500 }}>System Health</Typography>
                <Typography variant="caption" sx={{ opacity: 0.2 }}>•</Typography>
                <Typography variant="caption" sx={{ fontFamily: 'JetBrains Mono', fontWeight: 600, color: alpha(theme.palette.text.primary, 0.5), fontSize: '10px' }}>
                    v{import.meta.env.VITE_APP_VERSION || '0.0.0'}
                </Typography>
            </Box>

            {/* Right: PQC Engine Status */}
            <Box
                component={motion.div}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                sx={{ display: 'flex', alignItems: 'center', gap: { xs: 1.5, sm: 3 }, flexWrap: 'wrap', justifyContent: 'center' }}
            >
                {/* PQC Engine Badge */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 1, sm: 1.5 } }}>
                    <Box sx={{ position: 'relative', display: 'flex' }}>
                        <ShieldIcon
                            sx={{
                                fontSize: { xs: 16, sm: 18 },
                                color: isFinished ? theme.palette.success.main : (isBusy ? '#c084fc' : theme.palette.primary.main),
                                animation: 'none',
                                filter: (isBusy || isFinished) ? `drop-shadow(0 0 4px ${alpha(isFinished ? theme.palette.success.main : '#c084fc', 0.5)})` : 'none',
                                transition: 'all 0.3s ease'
                            }}
                        />
                        {(isOperational || isBusy || isFinished) && (
                            <Box sx={{ position: 'relative' }}>
                                <Box
                                    sx={{
                                        position: 'absolute',
                                        top: -2,
                                        right: -2,
                                        height: 5,
                                        width: 5,
                                        borderRadius: '50%',
                                        bgcolor: isFinished ? theme.palette.success.main : (isBusy ? '#c084fc' : theme.palette.info.main),
                                        boxShadow: `0 0 10px ${isFinished ? theme.palette.success.main : (isBusy ? '#c084fc' : theme.palette.info.main)}`,
                                        zIndex: 1
                                    }}
                                />
                                <Box
                                    sx={{
                                        position: 'absolute',
                                        top: -2,
                                        right: -2,
                                        height: 5,
                                        width: 5,
                                        borderRadius: '50%',
                                        border: `1.5px solid ${isFinished ? theme.palette.success.main : (isBusy ? '#c084fc' : theme.palette.info.main)}`,
                                        animation: 'ping 2s cubic-bezier(0, 0, 0.2, 1) infinite'
                                    }}
                                />
                            </Box>
                        )}
                    </Box>
                    <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.primary', fontSize: { xs: '10px', sm: '11px' } }}>
                        PQC Engine
                    </Typography>
                    <Typography
                        variant="caption"
                        sx={{
                            fontFamily: 'JetBrains Mono',
                            color: 'text.secondary',
                            fontSize: '9px',
                            display: { xs: 'none', sm: 'inline' },
                            fontWeight: 500,
                            opacity: 0.7
                        }}
                    >
                        @noble/post-quantum
                    </Typography>
                </Box>

                <Box sx={{ height: 16, width: '1px', bgcolor: alpha(theme.palette.divider, 0.1), display: { xs: 'none', sm: 'block' } }} />

                {/* Status Indicator */}
                <Box
                    sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1,
                        px: { xs: 1.5, sm: 2.5 },
                        py: 0.5,
                        borderRadius: 5,
                        bgcolor: status.bgcolor,
                        color: status.color,
                        border: `1px solid ${alpha(status.color, 0.2)}`,
                        width: 140, // Fixed width
                        justifyContent: 'center',
                        boxShadow: (status as any).glow ? `0 0 15px ${alpha(status.color, 0.15)}` : 'none',
                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                    }}
                >
                    {status.icon}
                    <Typography variant="caption" sx={{ fontWeight: 700, color: 'inherit', fontSize: '10px' }}>
                        {status.text}
                    </Typography>
                    {(isOperational || isBusy) && (
                        <Box sx={{ position: 'relative', display: 'flex' }}>
                            <Box sx={{ height: 6, width: 6, borderRadius: '50%', bgcolor: status.dotColor }} />
                        </Box>
                    )}
                </Box>
            </Box>

            <style>{`
                @keyframes ping {
                    0% { transform: scale(1); opacity: 0.8; }
                    100% { transform: scale(4); opacity: 0; }
                }
                @keyframes spin-slow {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
            `}</style>
        </Box>
    );
}
