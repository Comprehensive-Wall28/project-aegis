import { useState, useCallback, useMemo } from 'react';
import {
    Box,
    Typography,
    Grid,
    Snackbar,
    Alert,
    CircularProgress,
    alpha,
    useTheme,
} from '@mui/material';
import { School as SchoolIcon } from '@mui/icons-material';
import { useSessionStore } from '@/stores/sessionStore';
import { usePreferenceStore } from '@/stores/preferenceStore';
import gpaService from '@/services/gpaService';
import { CourseForm } from '@/components/gpa/CourseForm';
import { CourseList } from '@/components/gpa/CourseList';
import { SemesterGPAChart } from '@/components/gpa/SemesterGPAChart';
import { CumulativeGPAChart } from '@/components/gpa/CumulativeGPAChart';
import { BackendDown } from '@/components/BackendDown';
import {
    calculateNormalGPA,
    calculateGermanGPA,
    calculateSemesterGPAs,
    calculateCumulativeProgression,
} from '@/lib/gpaUtils';

// New abstractions
import { useGPAActions } from '@/hooks/useGPAActions';
import { GPAMetrics } from '@/components/gpa/GPAMetrics';
import { GPABanner } from '@/components/gpa/GPABanner';
import { GPASystemToggle } from '@/components/gpa/GPASystemToggle';

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

    const [snackbar, setSnackbar] = useState<SnackbarState>({
        open: false,
        message: '',
        severity: 'success',
    });

    const showSnackbar = useCallback((message: string, severity: SnackbarState['severity']) => {
        setSnackbar({ open: true, message, severity });
    }, []);

    const {
        courses,
        isLoading,
        isSaving,
        backendError,
        unmigratedCount,
        isMigrating,
        migrationProgress,
        fetchData,
        handleMigration,
        handleAddCourse,
        handleDeleteCourse,
    } = useGPAActions(showSnackbar);

    // Calculate GPA data client-side from decrypted courses
    const calculateGPAData = useCallback((decryptedCourses: any[]) => {
        const cumulativeGPA = gpaSystem === 'GERMAN'
            ? calculateGermanGPA(decryptedCourses)
            : calculateNormalGPA(decryptedCourses);

        const semesterGPAs = calculateSemesterGPAs(decryptedCourses, gpaSystem);
        const cumulativeProgression = calculateCumulativeProgression(decryptedCourses, gpaSystem);

        return {
            cumulativeGPA,
            totalCourses: decryptedCourses.length,
            totalCredits: decryptedCourses.reduce((sum, c) => sum + (c.credits || 0), 0),
            semesterGPAs,
            cumulativeProgression,
        };
    }, [gpaSystem]);

    // Calculate GPA data from current courses - memoized to prevent redundant O(N) work
    const gpaData = useMemo(() => calculateGPAData(courses), [courses, calculateGPAData]);

    const handleGPASystemChange = async (
        _event: React.MouseEvent<HTMLElement>,
        newSystem: 'NORMAL' | 'GERMAN' | null
    ) => {
        if (!newSystem) return;
        try {
            await gpaService.updatePreferences({ gpaSystem: newSystem });
            setGPASystem(newSystem);
            showSnackbar(`Switched to ${newSystem === 'GERMAN' ? 'German' : 'Normal (4.0)'} system`, 'success');
        } catch (error) {
            console.error('Failed to update GPA system:', error);
            showSnackbar('Failed to update GPA system', 'error');
        }
    };

    if (backendError) {
        return <BackendDown onRetry={fetchData} />;
    }

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {/* Header */}
            <Box
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

                {pqcEngineStatus === 'operational' && !isLoading && (
                    <GPASystemToggle
                        gpaSystem={gpaSystem}
                        onChange={handleGPASystemChange}
                        disabled={isSaving}
                    />
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
                    <GPABanner
                        unmigratedCount={unmigratedCount}
                        isMigrating={isMigrating}
                        migrationProgress={migrationProgress}
                        onMigrate={handleMigration}
                    />

                    <GPAMetrics
                        cumulativeGPA={gpaData.cumulativeGPA}
                        totalCredits={gpaData.totalCredits}
                        totalCourses={gpaData.totalCourses}
                    />

                    <Grid container spacing={{ xs: 2, sm: 3 }}>
                        <Grid size={{ xs: 12 }}>
                            <CumulativeGPAChart data={gpaData.cumulativeProgression} />
                        </Grid>
                        <Grid size={{ xs: 12 }}>
                            <SemesterGPAChart data={gpaData.semesterGPAs} />
                        </Grid>
                        <Grid size={{ xs: 12 }}>
                            <CourseForm onSubmit={handleAddCourse} isLoading={isSaving} />
                        </Grid>
                        <Grid size={{ xs: 12 }}>
                            <CourseList courses={courses} onDelete={handleDeleteCourse} isLoading={isSaving} />
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
