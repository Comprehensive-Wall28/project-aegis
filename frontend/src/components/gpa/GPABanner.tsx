import { Paper, Box, Typography, Button, CircularProgress, alpha } from '@mui/material';
import { Warning as WarningIcon } from '@mui/icons-material';

interface GPABannerProps {
    unmigratedCount: number;
    isMigrating: boolean;
    migrationProgress: {
        migrated: number;
        total: number;
    };
    onMigrate: () => void;
}

export const GPABanner = ({ unmigratedCount, isMigrating, migrationProgress, onMigrate }: GPABannerProps) => {
    if (unmigratedCount === 0) return null;

    return (
        <Paper
            sx={{
                p: 2,
                borderRadius: '12px',
                bgcolor: alpha('#ed6c02', 0.1), // warning.main equivalent
                border: `1px solid ${alpha('#ed6c02', 0.3)}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: 2,
            }}
        >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <WarningIcon sx={{ color: '#ed6c02' }} />
                <Box>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {unmigratedCount} course(s) need encryption
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                        Migrate your old courses to the new PQC-encrypted format
                    </Typography>
                </Box>
            </Box>
            <Button
                variant="contained"
                color="warning"
                size="small"
                onClick={onMigrate}
                disabled={isMigrating}
                sx={{ borderRadius: '8px', fontWeight: 600 }}
            >
                {isMigrating ? (
                    <>
                        <CircularProgress size={16} sx={{ mr: 1 }} color="inherit" />
                        Migrating ({migrationProgress.migrated}/{migrationProgress.total})
                    </>
                ) : (
                    'Migrate Now'
                )}
            </Button>
        </Paper>
    );
};
