import {
    Box,
    Paper,
    Typography,
    alpha,
    useTheme,
} from '@mui/material';
import {
    Link as LinkIcon,
} from '@mui/icons-material';
import { PublicLinkSettings } from './PublicLinkSettings';

interface SecuritySettingsProps {
    onNotification: (type: 'success' | 'error', message: string) => void;
}

export function SecuritySettings({ onNotification }: SecuritySettingsProps) {
    const theme = useTheme();

    const sharedPaperStyles = {
        p: { xs: 2, sm: 4 },
        borderRadius: '16px',
        bgcolor: theme.palette.background.paper,
        border: `1px solid ${alpha(theme.palette.divider, 0.08)}`,
        boxShadow: '0 4px 24px -1px rgba(0, 0, 0, 0.2)',
    };

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {/* Public Link Management */}
            <Paper sx={sharedPaperStyles}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'text.secondary', letterSpacing: '0.1em', fontSize: '10px', mb: 3, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <LinkIcon sx={{ fontSize: 14 }} />
                    PUBLIC LINKS MANAGEMENT
                </Typography>
                <PublicLinkSettings onNotification={onNotification} />
            </Paper>
        </Box>
    );
}

export default SecuritySettings;

