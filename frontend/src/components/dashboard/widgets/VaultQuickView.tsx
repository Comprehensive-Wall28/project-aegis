import {
    FolderOpen as FolderOpenIcon,
    OpenInNew as ExternalLinkIcon
} from '@mui/icons-material';
import {
    Box,
    Typography,
    Button,
    Paper,
    alpha,
    useTheme
} from '@mui/material';
import { Link } from 'react-router-dom';
import UploadZone from '@/components/vault/UploadZone';

export function VaultQuickView() {
    const theme = useTheme();

    return (
        <Paper
            sx={{
                p: { xs: 2.5, sm: 3 },
                height: '100%',
                borderRadius: '16px',
                bgcolor: theme.palette.background.paper,
                border: `1px solid ${alpha(theme.palette.divider, 0.08)}`,
                display: 'flex',
                flexDirection: 'column',
                position: 'relative',
                overflow: 'hidden',
                boxShadow: '0 4px 24px -1px rgba(0, 0, 0, 0.2)',
                transition: 'border-color 0.3s ease, box-shadow 0.3s ease',
            }}
        >
            {/* Header */}
            <Box sx={{
                display: 'flex',
                flexDirection: { xs: 'column', sm: 'row' },
                alignItems: { xs: 'flex-start', sm: 'center' },
                justifyContent: 'space-between',
                gap: 2,
                mb: 3
            }}>
                <Box>
                    <Typography
                        variant="h6"
                        sx={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 1.5,
                            fontWeight: 700,
                            fontSize: { xs: '1.1rem', sm: '1.25rem' },
                            whiteSpace: 'nowrap'
                        }}
                    >
                        <FolderOpenIcon color="primary" sx={{ fontSize: { xs: 20, sm: 24 } }} />
                        Secure Vault
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 500, display: 'block', mt: 0.5 }}>
                        Drag & drop to encrypt with AES-CTR
                    </Typography>
                </Box>
                <Button
                    component={Link}
                    to="/dashboard/files"
                    size="small"
                    endIcon={<ExternalLinkIcon sx={{ fontSize: 14 }} />}
                    sx={{
                        fontSize: '11px',
                        fontFamily: 'JetBrains Mono',
                        height: 32,
                        borderRadius: '8px',
                        bgcolor: alpha(theme.palette.primary.main, 0.15),
                        color: theme.palette.primary.main,
                        px: 2,
                        whiteSpace: 'nowrap',
                        '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.15) }
                    }}
                >
                    All Files
                </Button>
            </Box>

            {/* Content: Flex 1 to fill available space */}
            <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: { xs: 2.5, sm: 3 }, height: '100%' }}>
                {/* Upload Zone */}
                <Box sx={{ flex: 1, minHeight: { xs: 240, sm: 280, md: 300 }, display: 'flex', flexDirection: 'column' }}>
                    <UploadZone onUploadComplete={() => { }} sx={{ flex: 1 }} />
                </Box>
            </Box>
        </Paper>
    );
}
