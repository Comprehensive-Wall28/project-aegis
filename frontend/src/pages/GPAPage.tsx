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
    Chip,
    Button,
} from '@mui/material';
import {
    School as SchoolIcon,
    TrendingUp as TrendingUpIcon,
    Warning as WarningIcon,
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

    if (isLoading) {
        return (
            <Box
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: '100%',
                    minHeight: 400,
                }}
            >
                <CircularProgress />
            </Box>
        );
    }

    if (pqcEngineStatus !== 'operational') {
        return (
            <Box
                sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: '100%',
                    minHeight: 400,
                    gap: 2,
                }}
            >
                <CircularProgress />
                <Typography color="text.secondary">
                    Initializing PQC Engine...
                </Typography>
            </Box>
        );
    }

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
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

            {/* Header */}
            <Box
                component={motion.div}
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: 2,
                }}
            >
                <Box>
                    <Typography variant="h4" sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
                        <SchoolIcon /> GPA Management
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        Track your academic performance with PQC-encrypted records
                    </Typography>
                </Box>

                {/* GPA System Toggle */}
                <Paper
                    sx={{
                        p: 1,
                        borderRadius: '12px',
                        bgcolor: alpha(theme.palette.background.paper, 0.4),
                        backdropFilter: 'blur(12px)',
                        border: `1px solid ${alpha(theme.palette.common.white, 0.05)}`,
                    }}
                >
                    <ToggleButtonGroup
                        value={gpaSystem}
                        exclusive
                        onChange={handleGPASystemChange}
                        disabled={isSaving}
                        size="small"
                    >
                        <ToggleButton value="NORMAL" sx={{ textTransform: 'none', px: 2 }}>
                            Normal (4.0)
                        </ToggleButton>
                        <ToggleButton value="GERMAN" sx={{ textTransform: 'none', px: 2 }}>
                            German (Bavarian)
                        </ToggleButton>
                    </ToggleButtonGroup>
                </Paper>
            </Box>

            {/* GPA Summary Cards */}
            <Grid container spacing={3}>
                <Grid size={{ xs: 12, md: 4 }}>
                    <Paper
                        component={motion.div}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        sx={{
                            p: 3,
                            borderRadius: '16px',
                            bgcolor: alpha(theme.palette.background.paper, 0.4),
                            backdropFilter: 'blur(12px)',
                            border: `1px solid ${alpha(theme.palette.common.white, 0.05)}`,
                        }}
                    >
                        <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                            Cumulative GPA
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1 }}>
                            <Typography
                                variant="h3"
                                sx={{
                                    fontFamily: 'JetBrains Mono, monospace',
                                    fontWeight: 800,
                                    color: theme.palette.primary.main,
                                }}
                            >
                                {gpaData.cumulativeGPA.toFixed(2)}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                / {gpaSystem === 'GERMAN' ? '1.00' : '4.00'}
                            </Typography>
                        </Box>
                    </Paper>
                </Grid>

                <Grid size={{ xs: 6, md: 4 }}>
                    <Paper
                        component={motion.div}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.1 }}
                        sx={{
                            p: 3,
                            borderRadius: '16px',
                            bgcolor: alpha(theme.palette.background.paper, 0.4),
                            backdropFilter: 'blur(12px)',
                            border: `1px solid ${alpha(theme.palette.common.white, 0.05)}`,
                        }}
                    >
                        <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                            Total Courses
                        </Typography>
                        <Typography
                            variant="h3"
                            sx={{
                                fontFamily: 'JetBrains Mono, monospace',
                                fontWeight: 800,
                            }}
                        >
                            {gpaData.totalCourses}
                        </Typography>
                    </Paper>
                </Grid>

                <Grid size={{ xs: 6, md: 4 }}>
                    <Paper
                        component={motion.div}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.2 }}
                        sx={{
                            p: 3,
                            borderRadius: '16px',
                            bgcolor: alpha(theme.palette.background.paper, 0.4),
                            backdropFilter: 'blur(12px)',
                            border: `1px solid ${alpha(theme.palette.common.white, 0.05)}`,
                        }}
                    >
                        <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                            Total Credits
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1 }}>
                            <Typography
                                variant="h3"
                                sx={{
                                    fontFamily: 'JetBrains Mono, monospace',
                                    fontWeight: 800,
                                }}
                            >
                                {gpaData.totalCredits}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                hrs
                            </Typography>
                        </Box>
                    </Paper>
                </Grid>
            </Grid>

            {/* Charts */}
            <Grid container spacing={3}>
                <Grid size={{ xs: 12, md: 6 }}>
                    <SemesterGPAChart data={gpaData.semesterGPAs} />
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                    <CumulativeGPAChart data={gpaData.cumulativeProgression} />
                </Grid>
            </Grid>

            {/* Course Management */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 2 }}>
                <TrendingUpIcon color="primary" />
                <Typography variant="h5" sx={{ fontWeight: 700 }}>
                    Course Management
                </Typography>
                {pqcEngineStatus !== 'operational' && (
                    <Chip
                        label="PQC Engine Required"
                        color="warning"
                        size="small"
                    />
                )}
            </Box>

            <CourseForm onSubmit={handleAddCourse} isLoading={isSaving} />

            <CourseList
                courses={courses}
                onDelete={handleDeleteCourse}
                isLoading={isSaving}
            />

            {/* Snackbar for notifications */}
            <Snackbar
                open={snackbar.open}
                autoHideDuration={4000}
                onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            >
                <Alert
                    onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
                    severity={snackbar.severity}
                    sx={{ width: '100%' }}
                >
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </Box>
    );
}
