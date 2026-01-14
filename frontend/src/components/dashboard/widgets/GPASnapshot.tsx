import { useState, useEffect, useRef } from 'react';
import {
    School as GraduationCapIcon,
    Warning as WarningIcon
} from '@mui/icons-material';
import {
    Box,
    Typography,
    Button,
    CircularProgress,
    Paper,
    alpha,
    useTheme
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import gpaService from '@/services/gpaService';
import { usePreferenceStore } from '@/stores/preferenceStore';
import { useSessionStore } from '@/stores/sessionStore';
import { useCourseEncryption } from '@/hooks/useCourseEncryption';
import { calculateNormalGPA, calculateGermanGPA } from '@/lib/gpaUtils';
import { motion } from 'framer-motion';

export function GPASnapshot() {
    const [currentGPA, setCurrentGPA] = useState<number | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [hasError, setHasError] = useState(false);
    const hasFetched = useRef(false); // Prevent duplicate fetches
    const theme = useTheme();
    const navigate = useNavigate();
    const gpaSystem = usePreferenceStore((state) => state.gpaSystem);
    const pqcEngineStatus = useSessionStore((state) => state.pqcEngineStatus);
    const { decryptCourses } = useCourseEncryption();

    useEffect(() => {
        // Only fetch once when PQC engine becomes operational
        if (pqcEngineStatus === 'operational' && !hasFetched.current) {
            hasFetched.current = true;
            fetchGPAData();
        }
    }, [pqcEngineStatus]);

    const fetchGPAData = async () => {
        try {
            setIsLoading(true);
            setHasError(false);
            // Fetch encrypted courses and decrypt client-side
            const encryptedCourses = await gpaService.getEncryptedCourses();

            if (encryptedCourses.length > 0) {
                const decryptedCourses = await decryptCourses(encryptedCourses);
                // Calculate GPA client-side
                const gpa = gpaSystem === 'GERMAN'
                    ? calculateGermanGPA(decryptedCourses)
                    : calculateNormalGPA(decryptedCourses);
                setCurrentGPA(gpa);
            } else {
                setCurrentGPA(0);
            }
        } catch (err) {
            console.error('Failed to fetch GPA:', err);
            setHasError(true);
            setCurrentGPA(null);
        } finally {
            setIsLoading(false);
        }
    };

    // For German system: 1.0 is best, 4.0 is minimum pass.
    // Progress gauge should show how close you are to 1.0 from 4.0.
    const isGerman = gpaSystem === 'GERMAN';
    const gpaPercentage = currentGPA
        ? (isGerman
            ? ((4.0 - currentGPA) / 3.0) * 100
            : (currentGPA / 4.0) * 100)
        : 0;

    // Show loading while PQC engine initializes
    if (pqcEngineStatus !== 'operational') {
        return (
            <Paper
                sx={{
                    p: 3,
                    height: '100%',
                    borderRadius: '16px',
                    bgcolor: alpha(theme.palette.background.paper, 0.5),
                    backdropFilter: 'blur(8px)',
                    border: `1px solid ${alpha(theme.palette.common.white, 0.05)}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                }}
            >
                <CircularProgress size={24} />
            </Paper>
        );
    }

    return (
        <Paper
            sx={{
                p: { xs: 2, sm: 3 }, // Reduced padding on mobile
                height: '100%',
                borderRadius: '16px',
                bgcolor: alpha(theme.palette.background.paper, 0.4),
                backdropFilter: 'blur(12px)',
                border: `1px solid ${alpha(theme.palette.common.white, 0.05)}`,
                display: 'flex',
                flexDirection: 'column',
                position: 'relative',
                overflow: 'hidden',
                boxShadow: '0 4px 24px -1px rgba(0, 0, 0, 0.2)',
                transition: 'all 0.3s ease',
                '&:hover': {
                    border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
                    boxShadow: `0 8px 32px -4px ${alpha(theme.palette.primary.main, 0.05)}`,
                }
            }}
        >
            <Box sx={{
                flex: 1,
                display: 'flex',
                flexDirection: { xs: 'column', sm: 'row' }, // Stack on mobile
                alignItems: { xs: 'center', sm: 'center' },
                justifyContent: 'space-between',
                gap: { xs: 3, sm: 0 } // Add gap when stacked
            }}>
                {/* Left Side: Info & Button */}
                <Box sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: { xs: 'center', sm: 'flex-start' }, // Center on mobile
                    justifyContent: 'center',
                    height: '100%',
                    maxWidth: { xs: '100%', sm: '50%' }, // Full width on mobile
                    textAlign: { xs: 'center', sm: 'left' }
                }}>
                    <Box sx={{ mb: 2 }}>
                        <Typography variant="subtitle2" sx={{ display: 'flex', alignItems: 'center', justifyContent: { xs: 'center', sm: 'flex-start' }, gap: 1, fontWeight: 700, color: 'text.secondary', mb: 0.5 }}>
                            <GraduationCapIcon sx={{ fontSize: 18, color: theme.palette.primary.main }} />
                            GPA SNAPSHOT
                        </Typography>
                        <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 500, fontSize: '0.75rem', opacity: 0.8 }}>
                            {hasError ? 'Data sync required' : 'Your Academic Performance'}
                        </Typography>
                    </Box>

                    <Button
                        variant="contained"
                        onClick={() => navigate('/dashboard/gpa')}
                        disableElevation
                        sx={{
                            borderRadius: '10px',
                            textTransform: 'none',
                            fontWeight: 700,
                            fontSize: '12px',
                            px: 2.5,
                            py: 0.8,
                            bgcolor: theme.palette.primary.main,
                            color: '#000',
                            '&:hover': {
                                bgcolor: alpha(theme.palette.primary.main, 0.9),
                                transform: 'translateY(-1px)',
                            },
                            '&:active': { transform: 'translateY(0)' },
                            transition: 'all 0.2s',
                        }}
                    >
                        View Full Details
                    </Button>
                </Box>

                {/* Right Side: Gauge */}
                <Box sx={{ position: 'relative', width: 170, height: 100, display: 'flex', justifyContent: 'center', alignItems: 'flex-end', mb: { xs: 1, sm: 0 } }}>
                    {isLoading ? (
                        <CircularProgress size={24} thickness={5} />
                    ) : hasError ? (
                        <Box sx={{ textAlign: 'center', opacity: 0.7 }}>
                            <WarningIcon sx={{ fontSize: 32, color: 'warning.main', mb: 0.5 }} />
                            <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary', fontSize: '10px' }}>
                                Unable to load
                            </Typography>
                        </Box>
                    ) : (
                        <>
                            <svg width="170" height="100" viewBox="0 0 180 105">
                                <defs>
                                    <linearGradient id="gauge-gradient" x1="0" y1="0" x2="1" y2="0">
                                        <stop offset="0%" stopColor={theme.palette.primary.main} stopOpacity={0.8} />
                                        <stop offset="100%" stopColor={theme.palette.primary.light} stopOpacity={1} />
                                    </linearGradient>
                                </defs>
                                {/* Background Arc - Full 180 degrees */}
                                <path
                                    d="M 10 100 A 80 80 0 0 1 170 100"
                                    fill="none"
                                    stroke={alpha(theme.palette.common.white, 0.05)}
                                    strokeWidth="16"
                                    strokeLinecap="round"
                                />
                                {/* Progress Arc - Animated */}
                                <motion.path
                                    d="M 10 100 A 80 80 0 0 1 170 100"
                                    fill="none"
                                    stroke="url(#gauge-gradient)"
                                    strokeWidth="16"
                                    strokeLinecap="round"
                                    initial={{ pathLength: 0 }}
                                    animate={{ pathLength: Math.min(100, Math.max(0, gpaPercentage)) / 100 }}
                                    transition={{ duration: 1.5, ease: "easeOut" }}
                                />
                            </svg>
                            <Box sx={{ position: 'absolute', bottom: 5, textAlign: 'center' }}>
                                <Typography variant="h4" sx={{
                                    fontWeight: 800,
                                    lineHeight: 1,
                                    letterSpacing: -1,
                                    fontSize: '2.1rem',
                                    color: theme.palette.common.white,
                                    mb: -0.5
                                }}>
                                    {currentGPA?.toFixed(2) ?? '—'}
                                </Typography>
                                <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700, opacity: 0.8, fontSize: '0.7rem', letterSpacing: 0.5 }}>
                                    {isGerman ? 'TARGET 1.00' : '/ 4.00'}
                                </Typography>
                            </Box>
                        </>
                    )}
                </Box>
            </Box>
        </Paper>
    );
}
