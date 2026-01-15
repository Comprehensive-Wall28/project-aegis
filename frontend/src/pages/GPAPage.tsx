import { useState, useEffect, useCallback, useRef } from 'react';
import {
    Box,
    Typography,
    Paper,
    ToggleButtonGroup,
    ToggleButton,
    alpha,
    useTheme,
    Grid,
    Snackbar,
    Alert,
    CircularProgress,
    Button,
} from '@mui/material';
import {
    School as SchoolIcon,
    Warning as WarningIcon,
    TrendingUp as TrendingUpIcon,
    AccessTime as AccessTimeIcon,
    MenuBook as MenuBookIcon,
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import { useSessionStore } from '@/stores/sessionStore';
import { usePreferenceStore } from '@/stores/preferenceStore';
import gpaService from '@/services/gpaService';
import type { Course, CourseInput } from '@/services/gpaService';
import { CourseForm } from '@/components/gpa/CourseForm';
import { CourseList } from '@/components/gpa/CourseList';
import { SemesterGPAChart } from '@/components/gpa/SemesterGPAChart';
import { CumulativeGPAChart } from '@/components/gpa/CumulativeGPAChart';
import { useCourseEncryption } from '@/hooks/useCourseEncryption';
import { useCourseMigration } from '@/hooks/useCourseMigration';
import { BackendDown } from '@/components/BackendDown';
import {
    calculateNormalGPA,
    calculateGermanGPA,
    calculateSemesterGPAs,
    calculateCumulativeProgression,
} from '@/lib/gpaUtils';

type SnackbarState = {
    open: boolean;
    message: string;
    severity: 'success' | 'error' | 'info' | 'warning';
};

export function GPAPage() {
    const theme = useTheme();
    const pqcEngineStatus = useSessionStore((state) => state.pqcEngineStatus);
    const gpaSystem = usePreferenceStore((state) => state.gpaSystem);
    const setGPASystem = usePreferenceStore((state) => state.setGPASystem);

    const [courses, setCourses] = useState<Course[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [backendError, setBackendError] = useState(false);
    const [_decryptionError, setDecryptionError] = useState(false);
    const hasFetched = useRef(false); // Prevent duplicate fetches
    const [snackbar, setSnackbar] = useState<SnackbarState>({
        open: false,
        message: '',
        severity: 'success',
    });

    const { encryptCourseData, decryptCourses } = useCourseEncryption();
    const { progress: migrationProgress, checkMigrationNeeded, migrateAllCourses } = useCourseMigration();
    const [unmigratedCount, setUnmigratedCount] = useState(0);
    const [isMigrating, setIsMigrating] = useState(false);

    const showSnackbar = (message: string, severity: SnackbarState['severity']) => {
        setSnackbar({ open: true, message, severity });
    };

    // Calculate GPA data client-side from decrypted courses
    const calculateGPAData = useCallback((decryptedCourses: Course[]) => {
        const cumulativeGPA = gpaSystem === 'GERMAN'
            ? calculateGermanGPA(decryptedCourses)
            : calculateNormalGPA(decryptedCourses);

        const semesterGPAs = calculateSemesterGPAs(decryptedCourses, gpaSystem);
        const cumulativeProgression = calculateCumulativeProgression(decryptedCourses, gpaSystem);

        return {
            gpaSystem,
            cumulativeGPA,
            totalCourses: decryptedCourses.length,
            totalCredits: decryptedCourses.reduce((sum, c) => sum + c.credits, 0),
            semesterGPAs,
            cumulativeProgression,
        };
    }, [gpaSystem]);

    const fetchData = useCallback(async () => {
        try {
            setIsLoading(true);
            setBackendError(false);
            setDecryptionError(false);

            const [encryptedCourses, prefs] = await Promise.all([
                gpaService.getEncryptedCourses(),
                gpaService.getPreferences(),
            ]);

            // Decrypt courses client-side
            if (encryptedCourses.length > 0) {
                try {
                    const decryptedCourses = await decryptCourses(encryptedCourses);
                    setCourses(decryptedCourses as Course[]);
                } catch (decryptErr) {
                    console.error('Decryption failed (possibly unmigrated data):', decryptErr);
                    setDecryptionError(true);
                    setCourses([]);
                }
            } else {
                setCourses([]);
            }

            setGPASystem(prefs.gpaSystem);
        } catch (error: any) {
            console.error('Failed to fetch GPA data:', error);
            // Only show backend error for network issues
            if (error.code === 'ERR_NETWORK' || error.message === 'Network Error') {
                setBackendError(true);
            } else {
                // For other errors (like 429 rate limit), just show empty state
                setCourses([]);
            }
        } finally {
            setIsLoading(false);
        }
    }, [setGPASystem, decryptCourses]);

    // Check for unmigrated courses on mount
    useEffect(() => {
        const checkMigration = async () => {
            if (pqcEngineStatus === 'operational') {
                const count = await checkMigrationNeeded();
                setUnmigratedCount(count);
            }
        };
        checkMigration();
    }, [pqcEngineStatus, checkMigrationNeeded]);

    useEffect(() => {
        // Only fetch once when PQC engine becomes operational
        if (pqcEngineStatus === 'operational' && !hasFetched.current) {
            hasFetched.current = true;
            fetchData();
        }
    }, [pqcEngineStatus, fetchData]);

    // Handle migration of old courses
    const handleMigration = async () => {
        setIsMigrating(true);
        const result = await migrateAllCourses();
        setIsMigrating(false);

        if (result.success) {
            showSnackbar(`Successfully migrated ${result.migrated} course(s)`, 'success');
            setUnmigratedCount(0);
            // Refresh data to show migrated courses
            hasFetched.current = false;
            fetchData();
        } else {
            showSnackbar(`Migration completed with errors: ${result.errors[0]}`, 'warning');
        }
    };

    const handleGPASystemChange = async (
        _event: React.MouseEvent<HTMLElement>,
        newSystem: 'NORMAL' | 'GERMAN' | null
    ) => {
        if (!newSystem) return;

        try {
            setIsSaving(true);
            await gpaService.updatePreferences({ gpaSystem: newSystem });
            setGPASystem(newSystem);
            showSnackbar(`Switched to ${newSystem === 'GERMAN' ? 'German' : 'Normal (4.0)'} system`, 'success');
        } catch (error) {
            console.error('Failed to update GPA system:', error);
            showSnackbar('Failed to update GPA system', 'error');
        } finally {
            setIsSaving(false);
        }
    };

    const handleAddCourse = async (courseData: CourseInput) => {
        // Security check
        if (pqcEngineStatus !== 'operational') {
            showSnackbar('PQC Engine must be operational to add courses', 'warning');
            return;
        }

        try {
            setIsSaving(true);

            // Encrypt course data client-side before sending
            const encryptedPayload = await encryptCourseData(courseData);
            const newEncryptedCourse = await gpaService.createEncryptedCourse(encryptedPayload);

            // Decrypt the response and add to local state
            const decryptedCourse = {
                ...courseData,
                _id: newEncryptedCourse._id,
                createdAt: newEncryptedCourse.createdAt,
                updatedAt: newEncryptedCourse.updatedAt,
            };

            setCourses((prev) => [decryptedCourse, ...prev]);
            showSnackbar('Course added securely with PQC encryption', 'success');
        } catch (error) {
            console.error('Failed to add course:', error);
            showSnackbar('Failed to add course', 'error');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteCourse = async (courseId: string) => {
        try {
            setIsSaving(true);
            await gpaService.deleteCourse(courseId);
            setCourses((prev) => prev.filter((c) => c._id !== courseId));
            showSnackbar('Course deleted successfully', 'success');
        } catch (error) {
            console.error('Failed to delete course:', error);
            showSnackbar('Failed to delete course', 'error');
        } finally {
            setIsSaving(false);
        }
    };

    // Calculate GPA data from current courses
    const gpaData = calculateGPAData(courses);

    // Show backend error page
    if (backendError) {
        return <BackendDown onRetry={fetchData} />;
    }

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {/* Header - Rendered immediately for LCP */}
            <Box
                component={motion.div}
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                sx={{
                    display: 'flex',
                    flexDirection: { xs: 'column', md: 'row' },
                    alignItems: { xs: 'stretch', md: 'center' },
                    justifyContent: 'space-between',
                    gap: 2,
                }}
            >
                <Box>
                    <Typography variant="h4" sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1, fontSize: { xs: '1.5rem', sm: '2rem' } }}>
                        <SchoolIcon sx={{ fontSize: { xs: 24, sm: 32 } }} /> GPA Management
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '0.8rem', sm: '0.875rem' } }}>
                        Track your academic performance with PQC-encrypted records
                    </Typography>
                </Box>

                {/* GPA System Toggle */}
                {pqcEngineStatus === 'operational' && !isLoading && (
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
                            onChange={handleGPASystemChange}
                            disabled={isSaving}
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
                )}
            </Box>

            {/* Content Area */}
            {isLoading || pqcEngineStatus !== 'operational' ? (
                <Box
                    sx={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        minHeight: 500,
                        gap: 2,
                        bgcolor: alpha(theme.palette.background.paper, 0.1),
                        borderRadius: '16px',
                        border: `1px dashed ${alpha(theme.palette.divider, 0.1)}`,
                    }}
                >
                    <CircularProgress thickness={5} size={40} />
                    <Typography color="text.secondary" variant="body2" sx={{ fontWeight: 500 }}>
                        {pqcEngineStatus !== 'operational' ? 'Initializing PQC Engine...' : 'Decrypting secure records...'}
                    </Typography>
                </Box>
            ) : (
                <>
                    {/* Migration Banner */}
                    {unmigratedCount > 0 && (
                        <Paper
                            sx={{
                                p: 2,
                                borderRadius: '12px',
                                bgcolor: alpha(theme.palette.warning.main, 0.1),
                                border: `1px solid ${alpha(theme.palette.warning.main, 0.3)}`,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                flexWrap: 'wrap',
                                gap: 2,
                            }}
                        >
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                <WarningIcon sx={{ color: 'warning.main' }} />
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
                                onClick={handleMigration}
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
                    )}

                    {/* GPA Summary Cards */}
                    <Grid container spacing={{ xs: 2, sm: 3 }}>
                        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                            <Paper
                                component={motion.div}
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: 0 }}
                                sx={{
                                    p: { xs: 2, sm: 3 },
                                    borderRadius: '24px',
                                    bgcolor: alpha(theme.palette.background.paper, 0.4),
                                    backdropFilter: 'blur(12px)',
                                    border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
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
                                        bgcolor: alpha(theme.palette.primary.main, 0.1),
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                    }}
                                >
                                    <TrendingUpIcon sx={{ fontSize: 40, color: alpha(theme.palette.primary.main, 0.3) }} />
                                </Box>
                                <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1, fontSize: { xs: '0.75rem', sm: '0.875rem' }, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                                    Cumulative GPA
                                </Typography>
                                <Typography
                                    variant="h3"
                                    sx={{
                                        fontFamily: 'Inter, sans-serif',
                                        fontWeight: 700,
                                        background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.primary.light})`,
                                        backgroundClip: 'text',
                                        WebkitBackgroundClip: 'text',
                                        WebkitTextFillColor: 'transparent',
                                        fontSize: { xs: '2.5rem', sm: '3rem' },
                                    }}
                                >
                                    {gpaData.cumulativeGPA.toFixed(2)}
                                </Typography>
                            </Paper>
                        </Grid>

                        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                            <Paper
                                component={motion.div}
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: 0.1 }}
                                sx={{
                                    p: { xs: 2, sm: 3 },
                                    borderRadius: '24px',
                                    bgcolor: alpha(theme.palette.background.paper, 0.4),
                                    backdropFilter: 'blur(12px)',
                                    border: `1px solid ${alpha('#9c27b0', 0.2)}`,
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
                                        bgcolor: alpha('#9c27b0', 0.1),
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                    }}
                                >
                                    <AccessTimeIcon sx={{ fontSize: 40, color: alpha('#9c27b0', 0.3) }} />
                                </Box>
                                <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1, fontSize: { xs: '0.75rem', sm: '0.875rem' }, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                                    Total Credit Hours
                                </Typography>
                                <Typography
                                    variant="h3"
                                    sx={{
                                        fontFamily: 'Inter, sans-serif',
                                        fontWeight: 700,
                                        fontSize: { xs: '2.5rem', sm: '3rem' },
                                        background: `linear-gradient(135deg, #9c27b0, #ce93d8)`,
                                        backgroundClip: 'text',
                                        WebkitBackgroundClip: 'text',
                                        WebkitTextFillColor: 'transparent',
                                    }}
                                >
                                    {gpaData.totalCredits}
                                </Typography>
                            </Paper>
                        </Grid>

                        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                            <Paper
                                component={motion.div}
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: 0.2 }}
                                sx={{
                                    p: { xs: 2, sm: 3 },
                                    borderRadius: '24px',
                                    bgcolor: alpha(theme.palette.background.paper, 0.4),
                                    backdropFilter: 'blur(12px)',
                                    border: `1px solid ${alpha(theme.palette.success.main, 0.2)}`,
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
                                        bgcolor: alpha(theme.palette.success.main, 0.1),
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                    }}
                                >
                                    <MenuBookIcon sx={{ fontSize: 40, color: alpha(theme.palette.success.main, 0.3) }} />
                                </Box>
                                <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1, fontSize: { xs: '0.75rem', sm: '0.875rem' }, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                                    Total Courses
                                </Typography>
                                <Typography
                                    variant="h3"
                                    sx={{
                                        fontFamily: 'Inter, sans-serif',
                                        fontWeight: 700,
                                        fontSize: { xs: '2.5rem', sm: '3rem' },
                                        background: `linear-gradient(135deg, ${theme.palette.success.main}, ${theme.palette.success.light})`,
                                        backgroundClip: 'text',
                                        WebkitBackgroundClip: 'text',
                                        WebkitTextFillColor: 'transparent',
                                    }}
                                >
                                    {gpaData.totalCourses}
                                </Typography>
                            </Paper>
                        </Grid>

                        {/* Cumulative Chart - Full Width */}
                        <Grid size={{ xs: 12 }}>
                            <CumulativeGPAChart data={gpaData.cumulativeProgression} />
                        </Grid>

                        {/* Semester GPA Chart - Below Cumulative */}
                        <Grid size={{ xs: 12 }}>
                            <SemesterGPAChart data={gpaData.semesterGPAs} />
                        </Grid>

                        {/* Add Course Form - Below Cumulative */}
                        <Grid size={{ xs: 12 }}>
                            <CourseForm
                                onSubmit={handleAddCourse}
                                isLoading={isSaving}
                            />
                        </Grid>

                        {/* Course List - Full Width */}
                        <Grid size={{ xs: 12 }}>
                            <CourseList
                                courses={courses}
                                onDelete={handleDeleteCourse}
                                isLoading={isSaving}
                            />
                        </Grid>
                    </Grid>

                    <Snackbar
                        open={snackbar.open}
                        autoHideDuration={6000}
                        onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
                        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                    >
                        <Alert
                            onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
                            severity={snackbar.severity}
                            variant="filled"
                            sx={{ width: '100%', borderRadius: '12px' }}
                        >
                            {snackbar.message}
                        </Alert>
                    </Snackbar>
                </>
            )}
        </Box>
    );
}
