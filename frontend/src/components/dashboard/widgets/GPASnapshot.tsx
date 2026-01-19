import {
    School as GraduationCapIcon
} from '@mui/icons-material';
import {
    Box,
    Typography,
    Button,
    Paper,
    alpha,
    useTheme,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { usePreferenceStore } from '@/stores/preferenceStore';
import { motion } from 'framer-motion';
import { useDashboardStats } from '@/hooks/useDashboardStats';

export function GPASnapshot() {
    const theme = useTheme();
    const navigate = useNavigate();
    const gpaSystem = usePreferenceStore((state) => state.gpaSystem);
    const isSidebarCollapsed = usePreferenceStore((state) => state.isSidebarCollapsed);

    // Use the optimized dashboard stats hook
    const { currentGPA, hasError } = useDashboardStats();

    // For German system: 1.0 is best, 4.0 is minimum pass.
    // Progress gauge should show how close you are to 1.0 from 4.0.
    const isGerman = gpaSystem === 'GERMAN';
    const germanConfig = usePreferenceStore((state) => state.germanScaleConfig);

    // Better calculation for German system: 1.0 (nMax) is 100%, 4.0 (nMin) is 0%.
    // If it's worse than nMin, it should show 0% (but the number reflects the reality).
    const nMax = germanConfig?.nMax || 1.0;
    const nMin = germanConfig?.nMin || 4.0;

    const gpaPercentage = currentGPA !== null
        ? (isGerman
            ? Math.max(0, Math.min(100, ((nMin - currentGPA) / (nMin - nMax)) * 100))
            : Math.max(0, Math.min(100, (currentGPA / 4.0) * 100)))
        : 0;

    // Define colors based on performance
    const getStatusColor = () => {
        if (currentGPA === null) return theme.palette.primary.main;
        if (isGerman) {
            if (currentGPA <= 1.5) return theme.palette.primary.main; // Excellent
            if (currentGPA <= 2.5) return theme.palette.info.main;    // Good
            if (currentGPA <= 3.5) return theme.palette.text.primary; // Satisfactory (Themed neutral)
            return theme.palette.error.main;                         // Poor
        } else {
            if (currentGPA >= 3.7) return theme.palette.primary.main;
            if (currentGPA >= 3.0) return theme.palette.info.main;
            if (currentGPA >= 2.0) return theme.palette.text.primary; // Satisfactory (Themed neutral)
            return theme.palette.error.main;
        }
    };

    const statusColor = getStatusColor();


    return (
        <Paper
            sx={{
                p: { xs: 2, sm: 3 },
                height: '100%',
                borderRadius: '24px',
                bgcolor: theme.palette.background.paper,
                border: `1px solid ${alpha(theme.palette.divider, 0.08)}`,
                display: 'flex',
                flexDirection: 'column',
                position: 'relative',
                overflow: 'hidden',
                boxShadow: `0 8px 32px -8px ${alpha('#000', 0.5)}`,
                transition: 'border-color 0.4s ease, box-shadow 0.4s ease, transform 0.4s ease',
                transform: 'translateZ(0)',
                willChange: 'transform, opacity',
                '&::before': {
                    content: '""',
                    position: 'absolute',
                    top: 0,
                    right: 0,
                    width: '120px',
                    height: '120px',
                    background: `radial-gradient(circle at 100% 0%, ${alpha(statusColor, 0.15)} 0%, transparent 70%)`,
                    pointerEvents: 'none'
                },
                '&:hover': {
                    border: `1px solid ${alpha(statusColor, 0.3)}`,
                    boxShadow: `0 12px 48px -12px ${alpha(statusColor, 0.2)}`,
                    transform: 'translateY(-2px)'
                }
            }}
        >
            <Box sx={{
                flex: 1,
                display: 'flex',
                flexDirection: { xs: 'column', md: 'row' },
                alignItems: { xs: 'center', md: 'center' },
                justifyContent: 'space-between',
                gap: { xs: 3, md: 0, lg: isSidebarCollapsed ? 2 : 1, xl: 2 }
            }}>
                {/* Left Side: Info & Button */}
                <Box sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: { xs: 'center', md: 'flex-start' },
                    justifyContent: 'center',
                    height: '100%',
                    flex: 1,
                    textAlign: { xs: 'center', md: 'left' }
                }}>
                    <Box sx={{ mb: 3 }}>
                        <Typography variant="subtitle2" sx={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: { xs: 'center', md: 'flex-start' },
                            gap: 1.5,
                            fontWeight: 800,
                            color: 'text.primary',
                            mb: 0.5,
                            letterSpacing: '0.02em',
                            fontSize: { lg: isSidebarCollapsed ? '0.875rem' : '0.75rem', xl: '0.875rem' }
                        }}>
                            <GraduationCapIcon sx={{ fontSize: { xs: 20, lg: isSidebarCollapsed ? 20 : 16, xl: 20 }, color: statusColor }} />
                            GPA SNAPSHOT
                        </Typography>
                        <Typography variant="caption" sx={{
                            color: 'text.secondary',
                            fontWeight: 600,
                            fontSize: { xs: '0.75rem', lg: isSidebarCollapsed ? '0.75rem' : '0.65rem', xl: '0.75rem' },
                            opacity: 0.9
                        }}>
                            {hasError ? 'Sync failed. Retry required.' : 'Secure Academic Overview'}
                        </Typography>
                    </Box>

                    <Button
                        variant="contained"
                        onClick={() => navigate('/dashboard/gpa')}
                        disableElevation
                        sx={{
                            borderRadius: '14px',
                            textTransform: 'none',
                            fontWeight: 800,
                            fontSize: { xs: '0.8rem', lg: isSidebarCollapsed ? '0.8rem' : '0.7rem', xl: '0.8rem' },
                            px: { xs: 3, lg: isSidebarCollapsed ? 3 : 1.5, xl: 3 },
                            py: { xs: 1, lg: isSidebarCollapsed ? 1 : 0.5, xl: 1 },
                            bgcolor: alpha(theme.palette.text.primary, 0.1),
                            color: theme.palette.text.primary,
                            border: `1px solid ${alpha(theme.palette.text.primary, 0.2)}`,
                            '&:hover': {
                                bgcolor: alpha(theme.palette.text.primary, 0.15),
                                border: `1px solid ${alpha(theme.palette.text.primary, 0.3)}`,
                                transform: 'translateX(4px)',
                            },
                            transition: 'all 0.3s ease',
                        }}
                    >
                        Detailed Analytics
                    </Button>
                </Box>

                {/* Right Side: Gauge */}
                <Box sx={{
                    position: 'relative',
                    width: { xs: 180, lg: isSidebarCollapsed ? 180 : 150, xl: 180 },
                    height: { xs: 110, lg: isSidebarCollapsed ? 110 : 90, xl: 110 },
                    flexShrink: 0,
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'flex-end',
                    mb: { xs: 1, md: 0 }
                }}>
                    <svg width="100%" height="100%" viewBox="0 0 180 110">
                        <defs>
                            <linearGradient id="snapshot-gauge-gradient" x1="0" y1="0" x2="1" y2="0">
                                <stop offset="0%" stopColor={statusColor} stopOpacity={0.7} />
                                <stop offset="50%" stopColor={statusColor} stopOpacity={1} />
                                <stop offset="100%" stopColor={statusColor} stopOpacity={0.7} />
                            </linearGradient>
                            <filter id="gauge-glow">
                                <feGaussianBlur stdDeviation="3" result="coloredBlur" />
                                <feMerge>
                                    <feMergeNode in="coloredBlur" />
                                    <feMergeNode in="SourceGraphic" />
                                </feMerge>
                            </filter>
                        </defs>
                        {/* Background Arc */}
                        <path
                            d="M 15 100 A 75 75 0 0 1 165 100"
                            fill="none"
                            stroke={alpha(theme.palette.divider, 0.15)}
                            strokeWidth="14"
                            strokeLinecap="round"
                        />
                        {/* Progress Arc */}
                        <motion.path
                            d="M 15 100 A 75 75 0 0 1 165 100"
                            fill="none"
                            stroke="url(#snapshot-gauge-gradient)"
                            strokeWidth="14"
                            strokeLinecap="round"
                            filter="url(#gauge-glow)"
                            initial={{ pathLength: 0 }}
                            animate={{ pathLength: gpaPercentage / 100 }}
                            transition={{ duration: 2, ease: [0.34, 1.56, 0.64, 1] }}
                        />
                    </svg>
                    <Box sx={{
                        position: 'absolute',
                        bottom: 1,
                        textAlign: 'center',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center'
                    }}>
                        <Typography variant="h3" sx={{
                            fontWeight: 900,
                            lineHeight: 1,
                            letterSpacing: '-0.04em',
                            fontSize: { xs: '2.4rem', lg: isSidebarCollapsed ? '2.4rem' : '2.0rem', xl: '2.4rem' },
                            color: theme.palette.text.primary,
                            mb: 0.5,
                            textShadow: `0 0 20px ${alpha(statusColor, 0.4)}`
                        }}>
                            {currentGPA !== null ? currentGPA.toFixed(2) : '—'}
                        </Typography>
                        <Typography variant="caption" sx={{
                            color: 'text.secondary',
                            fontWeight: 800,
                            opacity: 0.8,
                            fontSize: '0.65rem',
                            letterSpacing: '0.1em',
                            textTransform: 'uppercase'
                        }}>
                            {isGerman ? `Target ${nMax.toFixed(2)}` : 'Academic GPA'}
                        </Typography>
                    </Box>
                </Box>
            </Box>
        </Paper>
    );
}
