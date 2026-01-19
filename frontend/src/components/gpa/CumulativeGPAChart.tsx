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

    if (data.length === 0) {
        return (
            <Paper
                sx={{
                    p: 3,
                    height: '100%',
                    minHeight: 300,
                    borderRadius: '16px',
                    bgcolor: theme.palette.background.paper,
                    border: `1px solid ${alpha(theme.palette.common.white, 0.15)}`,
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
                p: { xs: 2, sm: 3 },
                height: '100%',
                minHeight: 380,
                borderRadius: '24px',
                bgcolor: theme.palette.background.paper,
                border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                position: 'relative',
                overflow: 'hidden',
                '&::before': {
                    content: '""',
                    position: 'absolute',
                    top: 0,
                    right: 0,
                    width: '100px',
                    height: '100px',
                    background: `radial-gradient(circle at 100% 0%, ${alpha(theme.palette.primary.main, 0.15)} 0%, transparent 70%)`,
                    pointerEvents: 'none'
                }
            }}
        >
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
                <Box>
                    <Typography variant="h6" sx={{ fontWeight: 800, letterSpacing: '-0.02em', color: 'text.primary' }}>
                        Cumulative GPA Progression
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 500 }}>
                        Performance trend across semesters
                    </Typography>
                </Box>
                <Box sx={{ display: 'flex', gap: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: theme.palette.primary.main }} />
                        <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary' }}>Cumulative</Typography>
                    </Box>
                </Box>
            </Box>

            <Box sx={{ width: '100%', height: 280 }}>
                <LineChart
                    slotProps={{
                        tooltip: {
                            sx: {
                                '& .MuiChartsTooltip-root': {
                                    borderRadius: '12px',
                                    border: `1px solid ${alpha(theme.palette.divider, 0.2)}`,
                                    boxShadow: `0 8px 16px ${alpha('#000', 0.4)}`,
                                }
                            }
                        }
                    }}
                    dataset={data.map((d, index) => ({
                        index,
                        semester: d.semester,
                        gpa: d.cumulativeGPA,
                    }))}
                    xAxis={[
                        {
                            scaleType: 'point',
                            dataKey: 'semester',
                            disableLine: true,
                            disableTicks: true,
                            tickLabelStyle: {
                                fontSize: 10,
                                fontWeight: 600,
                                fill: theme.palette.text.secondary,
                                fontFamily: 'Inter, sans-serif'
                            },
                        },
                    ]}
                    yAxis={[
                        {
                            min: gpaSystem === 'GERMAN' ? 1.0 : 0,
                            max: gpaSystem === 'GERMAN' ? 4.0 : 4.0,
                            reverse: gpaSystem === 'GERMAN',
                            disableLine: true,
                            disableTicks: true,
                            tickLabelStyle: {
                                fontSize: 10,
                                fontWeight: 600,
                                fill: theme.palette.text.secondary,
                            },
                        },
                    ]}
                    grid={{ horizontal: true }}
                    series={[
                        {
                            dataKey: 'gpa',
                            label: 'Cumulative GPA',
                            color: theme.palette.primary.main,
                            curve: 'monotoneX',
                            showMark: true,
                            valueFormatter: (value) => value?.toFixed(2) || '0.00',
                            area: true,
                        },
                    ]}
                    hideLegend
                    margin={{ top: 10, right: 30, bottom: 40, left: 40 }}
                    sx={{
                        '& .MuiChartsGrid-line': {
                            stroke: alpha(theme.palette.divider, 0.05),
                            strokeDasharray: '4 4',
                        },
                        '& .MuiLineElement-root': {
                            strokeWidth: 4,
                            strokeLinecap: 'round',
                            filter: `drop-shadow(0 0 12px ${alpha(theme.palette.primary.main, 0.5)})`,
                        },
                        '& .MuiAreaElement-root': {
                            fill: `url(#gpa-gradient)`,
                            fillOpacity: 0.15,
                            maskImage: 'linear-gradient(to right, transparent, black 10%, black 90%, transparent)',
                            WebkitMaskImage: 'linear-gradient(to right, transparent, black 10%, black 90%, transparent)',
                        },
                        '& .MuiMarkElement-root': {
                            stroke: theme.palette.background.paper,
                            strokeWidth: 2,
                            scale: '1.2',
                            transition: 'all 0.2s ease',
                            '&:hover': {
                                scale: '1.5',
                            }
                        },
                    }}
                >
                    <defs>
                        <linearGradient id="gpa-gradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={theme.palette.primary.main} stopOpacity={0.6} />
                            <stop offset="80%" stopColor={theme.palette.primary.main} stopOpacity={0.05} />
                            <stop offset="100%" stopColor={theme.palette.primary.main} stopOpacity={0} />
                        </linearGradient>
                    </defs>
                </LineChart>
            </Box>
        </Paper>
    );
}
