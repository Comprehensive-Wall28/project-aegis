import {
    Shield as ShieldIcon,
    CheckCircle as CheckCircleIcon,
    Insights as ActivityIcon,
    Report as AlertCircleIcon
} from '@mui/icons-material';
import { Box, Typography, alpha, useTheme, CircularProgress } from '@mui/material';
import { useSessionStore } from '@/stores/sessionStore';


export function StatelessIndicator() {
    // We can use the store, or default to 'operational' for the landing page visual if strictly marketing.
    // However, the user mentioned status changing, so we'll bind to the store.
    const pqcEngineStatus = useSessionStore(state => state.pqcEngineStatus);
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
                    text: 'Connecting...',
                    color: theme.palette.text.secondary,
                    bgcolor: alpha(theme.palette.text.secondary, 0.1),
                    dotColor: theme.palette.text.secondary
                };
        }
    };

    const status = getStatusConfig();

    return (
        <Box
            sx={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 3,
                p: 1,
                pr: 2,
                borderRadius: '999px',
                bgcolor: alpha(theme.palette.background.paper, 0.4),
                border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                backdropFilter: 'blur(8px)',
            }}
        >
            {/* Left: Shield & Info */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, pl: 1 }}>
                <Box sx={{ position: 'relative', display: 'flex' }}>
                    <ShieldIcon
                        sx={{
                            fontSize: 20,
                            color: theme.palette.common.white,
                        }}
                    />
                    <Box
                        sx={{
                            position: 'absolute',
                            top: -1,
                            right: -1,
                            height: 6,
                            width: 6,
                            borderRadius: '50%',
                            bgcolor: theme.palette.info.main,
                            boxShadow: `0 0 8px ${theme.palette.info.main}`,
                            '&::after': {
                                content: '""',
                                position: 'absolute',
                                inset: -4,
                                borderRadius: '50%',
                                border: `1.5px solid ${theme.palette.info.main}`,
                                animation: 'ping 2s cubic-bezier(0, 0, 0.2, 1) infinite',
                            }
                        }}
                    />
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'text.primary' }}>
                        PQC Engine
                    </Typography>
                    <Typography
                        variant="caption"
                        sx={{
                            fontFamily: 'JetBrains Mono',
                            color: 'text.secondary',
                            fontSize: '0.75rem',
                            opacity: 0.7
                        }}
                    >
                        @noble/post-quantum
                    </Typography>
                </Box>
            </Box>

            <Box sx={{ height: 16, width: 1, bgcolor: 'divider' }} />

            {/* Right: Status Pill - FIXED WIDTH to prevent layout shift */}
            <Box
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    px: 1.5,
                    py: 0.5,
                    borderRadius: '999px',
                    bgcolor: status.bgcolor,
                    color: status.color,
                    border: `1px solid ${alpha(status.color, 0.2)}`,
                    width: 140, // Fixed width
                    justifyContent: 'center', // Center content within fixed width
                    transition: 'all 0.3s ease' // Smooth color transaction
                }}
            >
                {status.icon}
                <Typography variant="caption" sx={{ fontWeight: 700, fontSize: '0.75rem' }}>
                    {status.text}
                </Typography>
                <Box
                    sx={{
                        width: 6,
                        height: 6,
                        borderRadius: '50%',
                        bgcolor: status.dotColor,
                        ml: 'auto',
                        boxShadow: `0 0 6px ${status.dotColor}`
                    }}
                />
            </Box>

            <style>{`
                @keyframes ping {
                    0% {
                        transform: scale(1);
                        opacity: 0.8;
                    }
                    100% {
                        transform: scale(2.5);
                        opacity: 0;
                    }
                }
            `}</style>
        </Box>
    );
}
