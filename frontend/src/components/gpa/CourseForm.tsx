import { useState } from 'react';
import {
    Box,
    TextField,
    Button,
    Paper,
    Typography,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    alpha,
    useTheme,
    Grid,
} from '@mui/material';
import { Add as AddIcon } from '@mui/icons-material';
import { motion } from 'framer-motion';
import { usePreferenceStore } from '@/stores/preferenceStore';
import { getGradeRange } from '@/lib/gpaUtils';
import type { CourseInput } from '@/services/gpaService';

interface CourseFormProps {
    onSubmit: (course: CourseInput) => Promise<void>;
    isLoading?: boolean;
}

// Generate semester options dynamically
const generateSemesterOptions = (): string[] => {
    const currentYear = new Date().getFullYear();
    const semesters: string[] = [];

    // Generate semesters for 3 years back and 2 years forward
    for (let year = currentYear - 3; year <= currentYear + 2; year++) {
        semesters.push(`Winter ${year}`);
        semesters.push(`Spring ${year}`);
        semesters.push(`Summer ${year}`);
        semesters.push(`Fall ${year}`);
    }

    return semesters;
};

const SEMESTER_OPTIONS = generateSemesterOptions();

export function CourseForm({ onSubmit, isLoading = false }: CourseFormProps) {
    const theme = useTheme();
    const gpaSystem = usePreferenceStore((state) => state.gpaSystem);
    const gradeRange = getGradeRange(gpaSystem);

    const [formData, setFormData] = useState({
        name: '',
        grade: '',
        credits: '',
        semester: SEMESTER_OPTIONS[Math.floor(SEMESTER_OPTIONS.length / 2)], // Default to current year
    });

    const [errors, setErrors] = useState<Partial<Record<keyof CourseInput, string>>>({});

    const validate = (): boolean => {
        const newErrors: Partial<Record<keyof CourseInput, string>> = {};

        if (!formData.name.trim()) {
            newErrors.name = 'Course name is required';
        }

        const gradeNum = parseFloat(formData.grade);
        if (isNaN(gradeNum) || formData.grade === '') {
            newErrors.grade = 'Grade is required';
        } else if (gradeNum < gradeRange.min || gradeNum > gradeRange.max) {
            newErrors.grade = `Grade must be between ${gradeRange.min} and ${gradeRange.max}`;
        }

        const creditsNum = parseFloat(formData.credits);
        if (isNaN(creditsNum) || formData.credits === '') {
            newErrors.credits = 'Credits required';
        } else if (creditsNum <= 0) {
            newErrors.credits = 'Must be > 0';
        }

        if (!formData.semester) {
            newErrors.semester = 'Semester is required';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!validate()) return;

        await onSubmit({
            name: formData.name,
            grade: parseFloat(formData.grade),
            credits: parseFloat(formData.credits),
            semester: formData.semester,
        });

        // Reset form
        setFormData({
            name: '',
            grade: '',
            credits: '',
            semester: formData.semester, // Keep the same semester
        });
    };

    return (
        <Paper
            component={motion.div}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            sx={{
                p: 3,
                borderRadius: '24px',
                bgcolor: theme.palette.background.paper,
                border: `1px solid ${alpha(theme.palette.divider, 0.07)}`,
            }}
        >
            <Typography variant="h6" sx={{ mb: 3, fontWeight: 800, letterSpacing: '-0.01em' }}>
                Add New Course
            </Typography>

            <Box component="form" onSubmit={handleSubmit}>
                <Grid container spacing={2.5}>
                    <Grid size={{ xs: 12 }}>
                        <TextField
                            fullWidth
                            label="Course Name"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            error={!!errors.name}
                            helperText={errors.name}
                            placeholder="e.g., Quantum Cryptography"
                            size="small"
                            sx={{
                                '& .MuiOutlinedInput-root': { borderRadius: '12px' }
                            }}
                        />
                    </Grid>

                    <Grid size={{ xs: 6 }}>
                        <TextField
                            fullWidth
                            label="Grade"
                            value={formData.grade}
                            onChange={(e) => setFormData({ ...formData, grade: e.target.value })}
                            error={!!errors.grade}
                            helperText={errors.grade}
                            placeholder={gpaSystem === 'GERMAN' ? '1.0 - 5.0' : '0 - 4.0'}
                            size="small"
                            sx={{
                                '& .MuiOutlinedInput-root': { borderRadius: '12px' }
                            }}
                        />
                    </Grid>

                    <Grid size={{ xs: 6 }}>
                        <TextField
                            fullWidth
                            label="Credits"
                            value={formData.credits}
                            onChange={(e) => setFormData({ ...formData, credits: e.target.value })}
                            error={!!errors.credits}
                            helperText={errors.credits}
                            placeholder="e.g., 3"
                            size="small"
                            sx={{
                                '& .MuiOutlinedInput-root': { borderRadius: '12px' }
                            }}
                        />
                    </Grid>

                    <Grid size={{ xs: 12 }}>
                        <FormControl fullWidth size="small">
                            <InputLabel>Semester</InputLabel>
                            <Select
                                value={formData.semester}
                                onChange={(e) => setFormData({ ...formData, semester: e.target.value })}
                                label="Semester"
                                sx={{ borderRadius: '12px' }}
                            >
                                {SEMESTER_OPTIONS.map((sem) => (
                                    <MenuItem key={sem} value={sem}>
                                        {sem}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    </Grid>
                </Grid>

                <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
                    <Button
                        type="submit"
                        variant="contained"
                        disabled={isLoading}
                        startIcon={<AddIcon />}
                        sx={{
                            borderRadius: '14px',
                            textTransform: 'none',
                            fontWeight: 700,
                            px: 4,
                            py: 1,
                            boxShadow: `0 8px 16px ${alpha(theme.palette.primary.main, 0.25)}`,
                        }}
                    >
                        {isLoading ? 'Adding...' : 'Securely Add Record'}
                    </Button>
                </Box>
            </Box>
        </Paper>
    );
}
