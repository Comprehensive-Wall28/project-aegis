import { Paper, ToggleButtonGroup, ToggleButton, alpha, useTheme } from '@mui/material';

interface GPASystemToggleProps {
    gpaSystem: 'NORMAL' | 'GERMAN';
    onChange: (event: React.MouseEvent<HTMLElement>, newSystem: 'NORMAL' | 'GERMAN' | null) => void;
    disabled?: boolean;
}

export const GPASystemToggle = ({ gpaSystem, onChange, disabled }: GPASystemToggleProps) => {
    const theme = useTheme();

    return (
        <Paper
            sx={{
                p: 0.5,
                borderRadius: '16px',
                bgcolor: alpha(theme.palette.background.paper, 0.3),
                backdropFilter: 'blur(12px)',
                border: `1px solid ${alpha(theme.palette.common.white, 0.08)}`,
                alignSelf: { xs: 'stretch', md: 'auto' },
            }}
        >
            <ToggleButtonGroup
                value={gpaSystem}
                exclusive
                onChange={onChange}
                disabled={disabled}
                size="small"
                sx={{
                    width: { xs: '100%', md: 'auto' },
                    display: 'flex',
                    '& .MuiToggleButtonGroup-grouped': {
                        border: 'none',
                        borderRadius: '12px !important',
                        px: { xs: 1.5, sm: 2.5 },
                        py: 0.75,
                        fontSize: { xs: '0.75rem', sm: '0.8rem' },
                        fontWeight: 600,
                        textTransform: 'none',
                        color: alpha(theme.palette.text.primary, 0.6),
                        transition: 'all 0.2s ease',
                        flex: { xs: 1, md: 'none' },
                        '&:hover': {
                            bgcolor: alpha(theme.palette.common.white, 0.05),
                        },
                        '&.Mui-selected': {
                            bgcolor: alpha(theme.palette.primary.main, 0.15),
                            color: theme.palette.primary.main,
                            '&:hover': {
                                bgcolor: alpha(theme.palette.primary.main, 0.2),
                            },
                        },
                    },
                }}
            >
                <ToggleButton value="NORMAL">
                    Normal (4.0)
                </ToggleButton>
                <ToggleButton value="GERMAN">
                    German (Bavarian)
                </ToggleButton>
            </ToggleButtonGroup>
        </Paper>
    );
};
