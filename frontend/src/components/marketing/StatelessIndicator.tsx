import { Box, Typography, alpha } from '@mui/material';

export function StatelessIndicator() {

    const statusColor = '#00ff9d'; // Vibrant cyber-green for PQC

    return (
        <Box
            sx={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 1.5,
                pl: 1.25,
                pr: 2,
                py: 0.75,
                borderRadius: '100px',
                bgcolor: alpha(statusColor, 0.03),
                border: `1px solid ${alpha(statusColor, 0.15)}`,
                backdropFilter: 'blur(8px)',
                boxShadow: `0 0 0 1px ${alpha(statusColor, 0.05)}, 0 4px 20px ${alpha(statusColor, 0.1)}`,
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                cursor: 'default',
                userSelect: 'none',
                '&:hover': {
                    bgcolor: alpha(statusColor, 0.06),
                    border: `1px solid ${alpha(statusColor, 0.25)}`,
                    boxShadow: `0 0 0 1px ${alpha(statusColor, 0.1)}, 0 4px 30px ${alpha(statusColor, 0.2)}`,
                    transform: 'translateY(-1px)'
                }
            }}
        >
            {/* Animated Status Dot */}
            <Box sx={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', width: 12, height: 12 }}>
                <Box
                    sx={{
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        bgcolor: statusColor,
                        boxShadow: `0 0 10px ${statusColor}`,
                        position: 'relative',
                        zIndex: 1
                    }}
                />
                {/* Pulse Rings */}
                <Box
                    sx={{
                        position: 'absolute',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                        width: '100%',
                        height: '100%',
                        borderRadius: '50%',
                        border: `1px solid ${statusColor}`,
                        opacity: 0,
                        zIndex: 0,
                        animation: 'ripple 2.5s cubic-bezier(0.25, 0.8, 0.25, 1) infinite',
                    }}
                />
                <Box
                    sx={{
                        position: 'absolute',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                        width: '100%',
                        height: '100%',
                        borderRadius: '50%',
                        border: `1px solid ${statusColor}`,
                        opacity: 0,
                        zIndex: 0,
                        animation: 'ripple 2.5s cubic-bezier(0.25, 0.8, 0.25, 1) infinite',
                        animationDelay: '0.6s'
                    }}
                />
            </Box>

            <Typography
                variant="caption"
                sx={{
                    position: 'relative',
                    zIndex: 2,
                    fontWeight: 600,
                    letterSpacing: '0.08em',
                    color: statusColor,
                    textTransform: 'uppercase',
                    fontSize: '0.75rem',
                    textShadow: `0 0 15px ${alpha(statusColor, 0.6)}`,
                    opacity: 0.9
                }}
            >
                PQC Engine
            </Typography>

            <style>{`
                @keyframes ripple {
                    0% {
                        width: 100%;
                        height: 100%;
                        opacity: 0.8;
                    }
                    100% {
                        width: 300%;
                        height: 300%;
                        opacity: 0;
                    }
                }
            `}</style>
        </Box>
    );
}