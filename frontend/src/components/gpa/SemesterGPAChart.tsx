import { Box, Paper, Typography, alpha, useTheme } from '@mui/material';
import { BarChart } from '@mui/x-charts/BarChart';
import { motion } from 'framer-motion';
import { usePreferenceStore } from '@/stores/preferenceStore';
import type { SemesterGPA } from '@/services/gpaService';

interface SemesterGPAChartProps {
    data: SemesterGPA[];
}

export function SemesterGPAChart({ data }: SemesterGPAChartProps) {
    const theme = useTheme();
    const gpaSystem = usePreferenceStore((state) => state.gpaSystem);

    // For German system, lower is better (1.0 best), for Normal, higher is better (4.0 best)
    const maxGPA = gpaSystem === 'GERMAN' ? 4.0 : 4.0;

    if (data.length === 0) {
        return (
            <Paper
                sx={{
                    p: 3,
                    height: '100%',
                    minHeight: 300,
                    borderRadius: '16px',
                    bgcolor: alpha(theme.palette.background.paper, 0.4),
                    backdropFilter: 'blur(12px)',
                    border: `1px solid ${alpha(theme.palette.common.white, 0.05)}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                }}
            >
                <Typography color="text.secondary">
                    Add courses to see semester GPA chart
                </Typography>
            </Paper>
        );
    }

    return (
        <Paper
            component={motion.div}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            sx={{
                p: 3,
                height: '100%',
                minHeight: 350,
                borderRadius: '16px',
                bgcolor: alpha(theme.palette.background.paper, 0.4),
                backdropFilter: 'blur(12px)',
                border: `1px solid ${alpha(theme.palette.common.white, 0.05)}`,
            }}
        >
            <Typography variant="h6" sx={{ mb: 2, fontWeight: 700 }}>
                Semester GPA
            </Typography>

            <Box sx={{ width: '100%', height: 280 }}>
                <BarChart
                    dataset={data.map((d) => ({
                        semester: d.semester,
                        gpa: d.gpa,
                        courses: d.courseCount,
                    }))}
                    xAxis={[
                        {
                            scaleType: 'band',
                            dataKey: 'semester',
                            tickLabelStyle: {
                                fontSize: 11,
                                fontWeight: 500,
                                fill: theme.palette.text.secondary,
                            },
                        },
                    ]}
                    yAxis={[
                        {
                            min: 0,
                            max: maxGPA,
                            tickLabelStyle: {
                                fontSize: 11,
                                fontWeight: 500,
                                fill: theme.palette.text.secondary,
                            },
                        },
                    ]}
                    series={[
                        {
                            dataKey: 'gpa',
                            label: 'GPA',
                            color: theme.palette.primary.main,
                            valueFormatter: (value) => value?.toFixed(2) || '0.00',
                        },
                    ]}
                    hideLegend
                    margin={{ top: 20, right: 20, bottom: 40, left: 40 }}
                    borderRadius={8}
                    sx={{
                        '& .MuiChartsAxis-line': {
                            stroke: alpha(theme.palette.common.white, 0.1),
                        },
                        '& .MuiChartsAxis-tick': {
                            stroke: alpha(theme.palette.common.white, 0.1),
                        },
                        '& .MuiBarElement-root': {
                            fill: 'url(#bar-gradient)',
                            filter: 'drop-shadow(0px 4px 8px rgba(0, 0, 0, 0.1))',
                            transition: 'all 0.3s ease',
                            borderRadius: '4px 4px 0 0', // Added for rounded bars
                            '&:hover': {
                                filter: 'brightness(1.1) drop-shadow(0px 4px 12px rgba(0, 0, 0, 0.2))',
                            }
                        },
                    }}
                >
                    <defs>
                        <linearGradient id="bar-gradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={theme.palette.primary.main} stopOpacity={1} />
                            <stop offset="100%" stopColor={theme.palette.primary.main} stopOpacity={0.6} />
                        </linearGradient>
                    </defs>
                </BarChart>
            </Box>
        </Paper>
    );
}
