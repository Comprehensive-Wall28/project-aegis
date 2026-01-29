import { Box, Typography, Button, useTheme, alpha } from '@mui/material';
import { AlertCircle, RefreshCw } from 'lucide-react';

export function WidgetErrorFallback({ onRetry, error }: { onRetry: () => void, error: Error | null }) {
    const theme = useTheme();

    return (
        <Box
            sx={{
                p: 3,
                height: '100%',
                minHeight: 200,
                borderRadius: '16px',
                bgcolor: alpha(theme.palette.error.main, 0.05),
                border: `1px solid ${alpha(theme.palette.error.main, 0.2)}`,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 2,
                color: theme.palette.error.main,
            }}
        >
            <AlertCircle size={32} />
            <Box sx={{ textAlign: 'center' }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5 }}>
                    Widget Failed to Load
                </Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', maxWidth: 200 }}>
                    {error?.message || 'An unexpected error occurred.'}
                </Typography>
            </Box>
            <Button
                size="small"
                variant="outlined"
                color="error"
                startIcon={<RefreshCw size={14} />}
                onClick={onRetry}
                sx={{ borderRadius: '8px', textTransform: 'none' }}
            >
                Retry
            </Button>
        </Box>
    );
}
