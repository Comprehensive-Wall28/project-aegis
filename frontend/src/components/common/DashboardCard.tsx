import { Paper, type SxProps, type Theme, useTheme, alpha, type PaperProps } from '@mui/material';
import type { ReactNode } from 'react';

interface DashboardCardProps extends PaperProps {
    children: ReactNode;
    sx?: SxProps<Theme>;
    className?: string;
    noPadding?: boolean;
}

export function DashboardCard({ children, sx, className, noPadding = false, ...props }: DashboardCardProps) {
    const theme = useTheme();

    return (
        <Paper
            variant="solid"
            className={className}
            elevation={0}
            sx={{
                p: noPadding ? 0 : { xs: 2, sm: 2.5 },
                height: '100%',
                borderRadius: '24px',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                position: 'relative',
                contain: 'content',
                bgcolor: theme.palette.background.paper,
                backgroundImage: 'none',
                backdropFilter: 'none',
                border: `1px solid ${alpha(theme.palette.divider, 0.08)}`,
                boxShadow: '0 4px 24px -1px rgba(0, 0, 0, 0.2)',
                ...sx
            }}
            {...props}
        >
            {children}
        </Paper>
    );
}
