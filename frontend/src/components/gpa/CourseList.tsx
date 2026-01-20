import { useState } from 'react';
import {
    Box,
    Paper,
    Typography,
    IconButton,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Collapse,
    Chip,
    alpha,
    useTheme,
    Tooltip,
} from '@mui/material';
import {
    Delete as DeleteIcon,
    Edit as EditIcon,
    ExpandMore as ExpandMoreIcon,
    ExpandLess as ExpandLessIcon,
    School as SchoolIcon,
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import { usePreferenceStore } from '@/stores/preferenceStore';
import { getGradeLabel, calculateNormalGPA, calculateGermanGPA } from '@/lib/gpaUtils';
import type { Course } from '@/services/gpaService';

interface CourseListProps {
    courses: Course[];
    onDelete: (id: string) => Promise<void>;
    onEdit?: (course: Course) => void;
    isLoading?: boolean;
}

interface SemesterGroup {
    semester: string;
    courses: Course[];
    gpa: number;
}

export function CourseList({ courses, onDelete, onEdit, isLoading = false }: CourseListProps) {
    const theme = useTheme();
    const gpaSystem = usePreferenceStore((state) => state.gpaSystem);
    const germanConfig = usePreferenceStore((state) => state.germanScaleConfig);
    const [expandedSemesters, setExpandedSemesters] = useState<Set<string>>(new Set());

    // Group courses by semester
    const semesterGroups: SemesterGroup[] = (() => {
        const groups = new Map<string, Course[]>();

        courses.forEach((course) => {
            const existing = groups.get(course.semester) || [];
            groups.set(course.semester, [...existing, course]);
        });

        return Array.from(groups.entries())
            .map(([semester, semCourses]) => ({
                semester,
                courses: semCourses,
                gpa:
                    gpaSystem === 'GERMAN'
                        ? calculateGermanGPA(semCourses, germanConfig.nMax, germanConfig.nMin)
                        : calculateNormalGPA(semCourses),
            }))
            .sort((a, b) => b.semester.localeCompare(a.semester)); // Most recent first
    })();

    const toggleSemester = (semester: string) => {
        setExpandedSemesters((prev) => {
            const next = new Set(prev);
            if (next.has(semester)) {
                next.delete(semester);
            } else {
                next.add(semester);
            }
            return next;
        });
    };

    if (courses.length === 0) {
        return (
            <Paper
                sx={{
                    p: 4,
                    textAlign: 'center',
                    borderRadius: '24px',
                    bgcolor: theme.palette.background.paper,
                    border: `1px solid ${alpha(theme.palette.divider, 0.06)}`,
                }}
            >
                <SchoolIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
                <Typography variant="h6" color="text.secondary">
                    No courses added yet
                </Typography>
                <Typography variant="body2" color="text.secondary">
                    Add your first course using the form above
                </Typography>
            </Paper>
        );
    }

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <AnimatePresence>
                {semesterGroups.map((group) => (
                    <Paper
                        key={group.semester}
                        component={motion.div}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        sx={{
                            borderRadius: '24px',
                            bgcolor: theme.palette.background.paper,
                            border: `1px solid ${alpha(theme.palette.divider, 0.06)}`,
                            overflow: 'hidden',
                        }}
                    >
                        {/* Semester Header */}
                        <Box
                            onClick={() => toggleSemester(group.semester)}
                            sx={{
                                p: 2,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                cursor: 'pointer',
                                '&:hover': {
                                    bgcolor: alpha(theme.palette.primary.main, 0.05),
                                },
                            }}
                        >
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                                    {group.semester}
                                </Typography>
                                <Chip
                                    label={`${group.courses.length} course${group.courses.length !== 1 ? 's' : ''}`}
                                    size="small"
                                    sx={{
                                        bgcolor: alpha(theme.palette.primary.main, 0.1),
                                        color: theme.palette.primary.main,
                                        borderRadius: '8px',
                                        fontWeight: 600
                                    }}
                                />
                            </Box>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                <Typography
                                    variant="h6"
                                    sx={{
                                        fontFamily: 'JetBrains Mono, monospace',
                                        fontWeight: 700,
                                        color: theme.palette.primary.main,
                                    }}
                                >
                                    {group.gpa.toFixed(2)}
                                </Typography>
                                <IconButton size="small">
                                    {expandedSemesters.has(group.semester) ? (
                                        <ExpandLessIcon />
                                    ) : (
                                        <ExpandMoreIcon />
                                    )}
                                </IconButton>
                            </Box>
                        </Box>

                        {/* Course Table */}
                        <Collapse in={expandedSemesters.has(group.semester)}>
                            <TableContainer>
                                <Table size="small">
                                    <TableHead>
                                        <TableRow>
                                            <TableCell>Course</TableCell>
                                            <TableCell align="center">Grade</TableCell>
                                            <TableCell align="center">Credits</TableCell>
                                            <TableCell align="right">Actions</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {group.courses.map((course) => (
                                            <TableRow
                                                key={course._id}
                                                sx={{
                                                    '&:last-child td': { borderBottom: 0 },
                                                }}
                                            >
                                                <TableCell>
                                                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                                        {course.name}
                                                    </Typography>
                                                </TableCell>
                                                <TableCell align="center">
                                                    <Tooltip title={getGradeLabel(course.grade, gpaSystem)}>
                                                        <Typography
                                                            variant="body2"
                                                            sx={{
                                                                fontFamily: 'JetBrains Mono, monospace',
                                                                fontWeight: 600,
                                                            }}
                                                        >
                                                            {course.grade.toFixed(1)}
                                                        </Typography>
                                                    </Tooltip>
                                                </TableCell>
                                                <TableCell align="center">
                                                    <Typography
                                                        variant="body2"
                                                        sx={{ fontFamily: 'JetBrains Mono, monospace' }}
                                                    >
                                                        {course.credits}
                                                    </Typography>
                                                </TableCell>
                                                <TableCell align="right">
                                                    {onEdit && (
                                                        <IconButton
                                                            size="small"
                                                            onClick={() => onEdit(course)}
                                                            disabled={isLoading}
                                                        >
                                                            <EditIcon fontSize="small" />
                                                        </IconButton>
                                                    )}
                                                    <IconButton
                                                        size="small"
                                                        onClick={() => onDelete(course._id)}
                                                        disabled={isLoading}
                                                        color="error"
                                                    >
                                                        <DeleteIcon fontSize="small" />
                                                    </IconButton>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        </Collapse>
                    </Paper>
                ))}
            </AnimatePresence>
        </Box>
    );
}
