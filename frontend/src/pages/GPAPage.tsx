import { useState, useEffect, useCallback } from 'react';
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
} from '@mui/material';
import {
    School as SchoolIcon,
    TrendingUp as TrendingUpIcon,
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import { useSessionStore } from '@/stores/sessionStore';
import { usePreferenceStore } from '@/stores/preferenceStore';
import gpaService from '@/services/gpaService';
import type { Course, CourseInput, GPACalculation } from '@/services/gpaService';
import { CourseForm } from '@/components/gpa/CourseForm';
import { CourseList } from '@/components/gpa/CourseList';
import { SemesterGPAChart } from '@/components/gpa/SemesterGPAChart';
import { CumulativeGPAChart } from '@/components/gpa/CumulativeGPAChart';

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
    const [gpaData, setGpaData] = useState<GPACalculation | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [snackbar, setSnackbar] = useState<SnackbarState>({
        open: false,
        message: '',
        severity: 'success',
    });

    const showSnackbar = (message: string, severity: SnackbarState['severity']) => {
        setSnackbar({ open: true, message, severity });
    };

    const fetchData = useCallback(async () => {
        try {
            setIsLoading(true);
            const [coursesData, gpaCalc, prefs] = await Promise.all([
                gpaService.getCourses(),
                gpaService.getCalculatedGPA(),
                gpaService.getPreferences(),
            ]);
            setCourses(coursesData);
            setGpaData(gpaCalc);
            setGPASystem(prefs.gpaSystem);
        } catch (error) {
            console.error('Failed to fetch GPA data:', error);
            showSnackbar('Failed to load GPA data', 'error');
        } finally {
            setIsLoading(false);
        }
    }, [setGPASystem]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleGPASystemChange = async (
        _event: React.MouseEvent<HTMLElement>,
        newSystem: 'NORMAL' | 'GERMAN' | null
    ) => {
        if (!newSystem) return;

        try {
            setIsSaving(true);
            await gpaService.updatePreferences({ gpaSystem: newSystem });
            setGPASystem(newSystem);
            // Refetch GPA calculation with new system
            const gpaCalc = await gpaService.getCalculatedGPA();
            setGpaData(gpaCalc);
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
            const newCourse = await gpaService.createCourse(courseData);
            setCourses((prev) => [newCourse, ...prev]);
            // Refetch GPA calculation
            const gpaCalc = await gpaService.getCalculatedGPA();
            setGpaData(gpaCalc);
            showSnackbar('Course added successfully', 'success');
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
            // Refetch GPA calculation
            const gpaCalc = await gpaService.getCalculatedGPA();
            setGpaData(gpaCalc);
            showSnackbar('Course deleted successfully', 'success');
        } catch (error) {
            console.error('Failed to delete course:', error);
            showSnackbar('Failed to delete course', 'error');
        } finally {
            setIsSaving(false);
        }
    };

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

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
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
                        Track your academic performance across semesters
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
                                {gpaData?.cumulativeGPA.toFixed(2) || '0.00'}
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
                            {gpaData?.totalCourses || 0}
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
                                {gpaData?.totalCredits || 0}
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
                    <SemesterGPAChart data={gpaData?.semesterGPAs || []} />
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                    <CumulativeGPAChart data={gpaData?.cumulativeProgression || []} />
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
