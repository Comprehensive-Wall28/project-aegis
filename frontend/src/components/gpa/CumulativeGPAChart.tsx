import { Box, Paper, Typography, alpha, useTheme } from '@mui/material';
import { LineChart } from '@mui/x-charts/LineChart';
import { motion } from 'framer-motion';
import { usePreferenceStore } from '@/stores/preferenceStore';
import type { CumulativeProgression } from '@/services/gpaService';

interface CumulativeGPAChartProps {
    data: CumulativeProgression[];
}

export function CumulativeGPAChart({ data }: CumulativeGPAChartProps) {
    const theme = useTheme();
    const gpaSystem = usePreferenceStore((state) => state.gpaSystem);

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
                    Add courses to see cumulative GPA progression
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
                Cumulative GPA Progression
            </Typography>

            <Box sx={{ width: '100%', height: 280 }}>
                <LineChart
                    dataset={data.map((d, index) => ({
                        index,
                        semester: d.semester,
                        gpa: d.cumulativeGPA,
                    }))}
                    xAxis={[
                        {
                            scaleType: 'band',
                            dataKey: 'semester',
                            tickLabelStyle: {
                                fontSize: 11,
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
                                fill: theme.palette.text.secondary,
                            },
                        },
                    ]}
                    series={[
                        {
                            dataKey: 'gpa',
                            label: 'Cumulative GPA',
                            color: '#9c27b0',
                            curve: 'linear',
                            showMark: true,
                            valueFormatter: (value) => value?.toFixed(2) || '0.00',
                            area: true,
                        },
                    ]}
                    hideLegend
                    margin={{ top: 20, right: 20, bottom: 40, left: 40 }}
                    sx={{
                        '& .MuiChartsAxis-line': {
                            stroke: alpha(theme.palette.common.white, 0.2),
                        },
                        '& .MuiChartsAxis-tick': {
                            stroke: alpha(theme.palette.common.white, 0.2),
                        },
                        '& .MuiAreaElement-root': {
                            fill: alpha('#9c27b0', 0.1),
                        },
                    }}
                />
            </Box>
        </Paper>
    );
}
