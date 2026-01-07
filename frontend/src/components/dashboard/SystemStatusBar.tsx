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
    const { pqcEngineStatus } = useSessionStore();
    const theme = useTheme();

    const getStatusConfig = () => {
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

    return (
        <Box
            sx={{
                height: 40,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                px: 3,
                bgcolor: 'transparent'
            }}
        >
            {/* Left: System Label */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'text.secondary' }}>
                <Typography variant="caption" sx={{ fontSize: '11px', fontWeight: 500 }}>System Health</Typography>
                <Typography variant="caption" sx={{ opacity: 0.2 }}>•</Typography>
                <Typography variant="caption" sx={{ fontFamily: 'JetBrains Mono', fontWeight: 600, color: alpha(theme.palette.text.primary, 0.5), fontSize: '10px' }}>v1.0.0</Typography>
            </Box>

            {/* Right: PQC Engine Status */}
            <Box
                component={motion.div}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                sx={{ display: 'flex', alignItems: 'center', gap: 3 }}
            >
                {/* PQC Engine Badge */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Box sx={{ position: 'relative', display: 'flex' }}>
                        <ShieldIcon color="primary" sx={{ fontSize: 18 }} />
                        {isOperational && (
                            <Box
                                sx={{
                                    position: 'absolute',
                                    top: -2,
                                    right: -2,
                                    height: 6,
                                    width: 6,
                                    borderRadius: '50%',
                                    bgcolor: theme.palette.info.main,
                                    boxShadow: `0 0 10px ${theme.palette.info.main}`,
                                    animation: 'pulse 2s infinite'
                                }}
                            />
                        )}
                    </Box>
                    <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.primary', fontSize: '11px' }}>
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

                <Box sx={{ height: 16, width: '1px', bgcolor: alpha(theme.palette.divider, 0.1) }} />

                {/* Status Indicator */}
                <Box
                    sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1,
                        px: 2.5,
                        py: 0.5,
                        borderRadius: 5,
                        bgcolor: status.bgcolor,
                        color: status.color,
                        border: `1px solid ${alpha(status.color, 0.2)}`,
                        minWidth: 130,
                        justifyContent: 'center'
                    }}
                >
                    {status.icon}
                    <Typography variant="caption" sx={{ fontWeight: 700, color: 'inherit', fontSize: '10px' }}>
                        {status.text}
                    </Typography>
                    {isOperational && (
                        <Box sx={{ position: 'relative', display: 'flex' }}>
                            <Box sx={{ height: 6, width: 6, borderRadius: '50%', bgcolor: status.dotColor }} />
                            <Box
                                sx={{
                                    position: 'absolute',
                                    inset: 0,
                                    height: 6,
                                    width: 6,
                                    borderRadius: '50%',
                                    bgcolor: status.dotColor,
                                    animation: 'pulse 2s infinite'
                                }}
                            />
                        </Box>
                    )}
                </Box>
            </Box>

            <style>{`
                @keyframes pulse {
                    0% { transform: scale(1); opacity: 1; }
                    100% { transform: scale(2.5); opacity: 0; }
                }
            `}</style>
        </Box>
    );
}
