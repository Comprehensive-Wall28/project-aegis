import { Box, Typography, alpha } from '@mui/material';

export function StatelessIndicator() {
    const statusColor = '#81ca81'; // Approximating the oklch green

    return (
        <Box
            sx={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 1.5,
                px: 2,
                py: 0.75,
                borderRadius: '999px',
                bgcolor: alpha(statusColor, 0.1),
                border: `1px solid ${alpha(statusColor, 0.2)}`,
                backdropFilter: 'blur(4px)',
            }}
        >
            <Box
                sx={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    bgcolor: statusColor,
                    boxShadow: `0 0 12px ${statusColor}`,
                    position: 'relative',
                    '&::after': {
                        content: '""',
                        position: 'absolute',
                        inset: -4,
                        borderRadius: '50%',
                        border: `2px solid ${statusColor}`,
                        animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                    }
                }}
            />
            <Typography
                variant="caption"
                sx={{
                    fontWeight: 700,
                    letterSpacing: '0.05em',
                    color: statusColor,
                    textTransform: 'uppercase',
                    fontSize: '0.7rem'
                }}
            >
                PQC Engine
            </Typography>

            <style>{`
                @keyframes pulse {
                    0%, 100% { opacity: 0.5; transform: scale(1); }
                    50% { opacity: 0; transform: scale(1.5); }
                }
            `}</style>
        </Box>
    );
}
