import { Grid, Paper, Box, Typography, alpha, useTheme } from '@mui/material';
import { motion } from 'framer-motion';
import {
    TrendingUp as TrendingUpIcon,
    AccessTime as AccessTimeIcon,
    MenuBook as MenuBookIcon,
} from '@mui/icons-material';

interface GPAMetricsProps {
    cumulativeGPA: number;
    totalCredits: number;
    totalCourses: number;
}

export const GPAMetrics = ({ cumulativeGPA, totalCredits, totalCourses }: GPAMetricsProps) => {
    const theme = useTheme();

    const metrics = [
        {
            label: 'Cumulative GPA',
            value: cumulativeGPA.toFixed(2),
            icon: <TrendingUpIcon sx={{ fontSize: 40, color: alpha(theme.palette.primary.main, 0.3) }} />,
            color: theme.palette.primary.main,
            lightColor: theme.palette.primary.light,
            borderColor: alpha(theme.palette.primary.main, 0.2),
            bgColor: alpha(theme.palette.primary.main, 0.1),
            delay: 0,
        },
        {
            label: 'Total Credit Hours',
            value: totalCredits,
            icon: <AccessTimeIcon sx={{ fontSize: 40, color: alpha('#9c27b0', 0.3) }} />,
            color: '#9c27b0',
            lightColor: '#ce93d8',
            borderColor: alpha('#9c27b0', 0.2),
            bgColor: alpha('#9c27b0', 0.1),
            delay: 0.1,
        },
        {
            label: 'Total Courses',
            value: totalCourses,
            icon: <MenuBookIcon sx={{ fontSize: 40, color: alpha(theme.palette.success.main, 0.3) }} />,
            color: theme.palette.success.main,
            lightColor: theme.palette.success.light,
            borderColor: alpha(theme.palette.success.main, 0.2),
            bgColor: alpha(theme.palette.success.main, 0.1),
            delay: 0.2,
        },
    ];

    return (
        <Grid container spacing={{ xs: 2, sm: 3 }}>
            {metrics.map((metric) => (
                <Grid key={metric.label} size={{ xs: 12, sm: 6, md: 4 }}>
                    <Paper
                        component={motion.div}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: metric.delay }}
                        sx={{
                            p: { xs: 2, sm: 3 },
                            borderRadius: '24px',
                            bgcolor: alpha(theme.palette.background.paper, 0.4),
                            backdropFilter: 'blur(12px)',
                            border: `1px solid ${metric.borderColor}`,
                            height: '100%',
                            minHeight: 140,
                            position: 'relative',
                            overflow: 'hidden',
                        }}
                    >
                        <Box
                            sx={{
                                position: 'absolute',
                                top: -20,
                                right: -20,
                                width: 100,
                                height: 100,
                                borderRadius: '50%',
                                bgcolor: metric.bgColor,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                            }}
                        >
                            {metric.icon}
                        </Box>
                        <Typography
                            variant="subtitle2"
                            color="text.secondary"
                            sx={{
                                mb: 1,
                                fontSize: { xs: '0.75rem', sm: '0.875rem' },
                                fontWeight: 600,
                                textTransform: 'uppercase',
                                letterSpacing: 0.5,
                            }}
                        >
                            {metric.label}
                        </Typography>
                        <Typography
                            variant="h3"
                            sx={{
                                fontFamily: 'Inter, sans-serif',
                                fontWeight: 700,
                                background: `linear-gradient(135deg, ${metric.color}, ${metric.lightColor})`,
                                backgroundClip: 'text',
                                WebkitBackgroundClip: 'text',
                                WebkitTextFillColor: 'transparent',
                                fontSize: { xs: '2.5rem', sm: '3rem' },
                            }}
                        >
                            {metric.value}
                        </Typography>
                    </Paper>
                </Grid>
            ))}
        </Grid>
    );
};
