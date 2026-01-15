import { useState, useEffect, useCallback, useRef } from 'react';
import {
    Box,
    Typography,
    Paper,
    alpha,
    useTheme,
    Button,
    ToggleButtonGroup,
    ToggleButton,
    CircularProgress,
    Snackbar,
    Alert,
} from '@mui/material';
import {
    CheckCircle as TasksIcon,
    ViewKanban as KanbanIcon,
    ViewList as ListIcon,
    Add as AddIcon,
} from '@mui/icons-material';
// No framer-motion imports needed here anymore
import { useSessionStore } from '@/stores/sessionStore';
import { useTaskStore } from '@/stores/useTaskStore';
import { useTaskEncryption } from '@/hooks/useTaskEncryption';
import { KanbanBoard } from '@/components/tasks/KanbanBoard';
import { TaskList } from '@/components/tasks/TaskList';
import { TaskDialog, type TaskDialogData } from '@/components/tasks/TaskDialog';
import { BackendDown } from '@/components/BackendDown';

type ViewMode = 'kanban' | 'list';
type SnackbarState = {
    open: boolean;
    message: string;
    severity: 'success' | 'error' | 'info' | 'warning';
};

export function TasksPage() {
    const theme = useTheme();
    const pqcEngineStatus = useSessionStore((state) => state.pqcEngineStatus);

    const tasks = useTaskStore((state) => state.tasks);
    const isLoading = useTaskStore((state) => state.isLoading);
    const fetchTasks = useTaskStore((state) => state.fetchTasks);
    const addTask = useTaskStore((state) => state.addTask);
    const updateTask = useTaskStore((state) => state.updateTask);
    const deleteTask = useTaskStore((state) => state.deleteTask);
    const reorderTasks = useTaskStore((state) => state.reorderTasks);
    const updateTaskLocal = useTaskStore((state) => state.updateTaskLocal);

    const { encryptTaskData, decryptTasks, decryptTaskData, generateRecordHash } = useTaskEncryption();

    const [viewMode, setViewMode] = useState<ViewMode>('kanban');
    const [dialogOpen, setDialogOpen] = useState(false);
    const [selectedTask, setSelectedTask] = useState<any>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [backendError, setBackendError] = useState(false);
    const hasFetched = useRef(false);

    const [snackbar, setSnackbar] = useState<SnackbarState>({
        open: false,
        message: '',
        severity: 'success',
    });

    const showSnackbar = (message: string, severity: SnackbarState['severity']) => {
        setSnackbar({ open: true, message, severity });
    };

    // Fetch tasks when PQC engine is operational
    useEffect(() => {
        if (pqcEngineStatus === 'operational' && !hasFetched.current) {
            hasFetched.current = true;
            fetchTasks(undefined, decryptTasks).catch((err) => {
                if (err.code === 'ERR_NETWORK') {
                    setBackendError(true);
                }
            });
        }
    }, [pqcEngineStatus, fetchTasks, decryptTasks]);

    const handleAddTask = useCallback((status: 'todo' | 'in_progress' | 'done' = 'todo') => {
        setSelectedTask({ status });
        setDialogOpen(true);
    }, []);

    const handleTaskClick = useCallback((task: any) => {
        setSelectedTask(task);
        setDialogOpen(true);
    }, []);

    const handleDialogSubmit = async (data: TaskDialogData) => {
        if (pqcEngineStatus !== 'operational') {
            showSnackbar('PQC Engine must be operational', 'warning');
            return;
        }

        try {
            setIsSaving(true);

            const recordHash = await generateRecordHash(
                { title: data.title, description: data.description, notes: data.notes },
                data.priority,
                data.status,
                data.dueDate
            );

            const encryptedPayload = await encryptTaskData({
                title: data.title,
                description: data.description,
                notes: data.notes,
            });

            if (selectedTask?._id) {
                // Update existing task
                await updateTask(
                    selectedTask._id,
                    {
                        ...encryptedPayload,
                        dueDate: data.dueDate,
                        priority: data.priority,
                        status: data.status,
                        recordHash,
                    },
                    decryptTaskData
                );
                showSnackbar('Task updated securely', 'success');
            } else {
                // Create new task
                await addTask(
                    {
                        ...encryptedPayload,
                        dueDate: data.dueDate,
                        priority: data.priority,
                        status: data.status,
                        recordHash,
                    },
                    decryptTaskData
                );
                showSnackbar('Task created with PQC encryption', 'success');
            }

            setDialogOpen(false);
            setSelectedTask(null);
        } catch (error: any) {
            showSnackbar(error.message || 'Operation failed', 'error');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteTask = async (taskId: string) => {
        try {
            setIsSaving(true);
            await deleteTask(taskId);
            showSnackbar('Task deleted successfully', 'success');
            setDialogOpen(false);
            setSelectedTask(null);
        } catch (error: any) {
            showSnackbar(error.message || 'Failed to delete task', 'error');
        } finally {
            setIsSaving(false);
        }
    };

    const handleTaskMove = async (
        taskId: string,
        newStatus: 'todo' | 'in_progress' | 'done',
        newOrder: number
    ) => {
        try {
            // Optimistic update
            updateTaskLocal(taskId, { status: newStatus, order: newOrder });

            // Sync with backend
            await reorderTasks([{ id: taskId, status: newStatus, order: newOrder }]);
            showSnackbar('Task moved', 'success');
        } catch (error: any) {
            showSnackbar(error.message || 'Failed to move task', 'error');
        }
    };

    const handleStatusToggle = async (taskId: string, currentStatus: string) => {
        const newStatus = currentStatus === 'done' ? 'todo' : 'done';
        try {
            await reorderTasks([{ id: taskId, status: newStatus, order: 0 }]);
            showSnackbar(`Task marked as ${newStatus === 'done' ? 'complete' : 'incomplete'}`, 'success');
        } catch (error: any) {
            showSnackbar(error.message || 'Failed to update task', 'error');
        }
    };

    const handleRetry = () => {
        setBackendError(false);
        hasFetched.current = false;
        fetchTasks(undefined, decryptTasks).catch(() => setBackendError(true));
    };

    if (backendError) {
        return <BackendDown onRetry={handleRetry} />;
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
                    <Typography
                        variant="h4"
                        sx={{
                            fontWeight: 700,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 1.5,
                            fontSize: { xs: '1.5rem', sm: '2rem' },
                        }}
                    >
                        <TasksIcon sx={{ fontSize: { xs: 28, sm: 32 }, color: 'primary.main' }} />
                        Task Planner
                    </Typography>
                    <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{ fontSize: { xs: '0.8rem', sm: '0.875rem' } }}
                    >
                        PQC-encrypted task management for secure productivity
                    </Typography>
                </Box>

                {pqcEngineStatus === 'operational' && !isLoading && (
                    <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                        {/* View Mode Toggle */}
                        <Paper
                            sx={{
                                p: 0.5,
                                borderRadius: '14px',
                                bgcolor: alpha(theme.palette.background.paper, 0.3),
                                backdropFilter: 'blur(8px)',
                                border: `1px solid ${alpha(theme.palette.common.white, 0.08)}`,
                            }}
                        >
                            <ToggleButtonGroup
                                value={viewMode}
                                exclusive
                                onChange={(_, value) => value && setViewMode(value)}
                                size="small"
                                sx={{
                                    '& .MuiToggleButtonGroup-grouped': {
                                        border: 'none',
                                        borderRadius: '10px !important',
                                        px: 2.5,
                                        py: 0.75,
                                        fontSize: '0.8rem',
                                        fontWeight: 600,
                                        textTransform: 'none',
                                        color: alpha(theme.palette.text.primary, 0.6),
                                        transition: 'all 0.2s ease',
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
                                <ToggleButton value="kanban">
                                    <KanbanIcon sx={{ mr: 0.75, fontSize: 16 }} />
                                    Kanban
                                </ToggleButton>
                                <ToggleButton value="list">
                                    <ListIcon sx={{ mr: 0.75, fontSize: 16 }} />
                                    List
                                </ToggleButton>
                            </ToggleButtonGroup>
                        </Paper>

                        {/* Add Task Button */}
                        <Button
                            variant="contained"
                            startIcon={<AddIcon />}
                            onClick={() => handleAddTask('todo')}
                            sx={{
                                borderRadius: '12px',
                                textTransform: 'none',
                                fontWeight: 600,
                                px: 3,
                            }}
                        >
                            New Task
                        </Button>
                    </Box>
                )}
            </Box>

            {/* Content */}
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
                        {pqcEngineStatus !== 'operational'
                            ? 'Initializing PQC Engine...'
                            : 'Decrypting secure tasks...'}
                    </Typography>
                </Box>
            ) : (
                <>
                    {viewMode === 'kanban' ? (
                        <KanbanBoard
                            tasks={tasks}
                            onTaskClick={handleTaskClick}
                            onAddTask={handleAddTask}
                            onTaskMove={handleTaskMove}
                        />
                    ) : (
                        <Paper
                            sx={{
                                p: 3,
                                borderRadius: '20px',
                                bgcolor: alpha(theme.palette.background.paper, 0.4),
                                backdropFilter: 'blur(8px)',
                                border: `1px solid ${alpha(theme.palette.common.white, 0.08)}`,
                            }}
                        >
                            <TaskList
                                tasks={tasks}
                                onTaskClick={handleTaskClick}
                                onStatusToggle={handleStatusToggle}
                                onDelete={handleDeleteTask}
                            />
                        </Paper>
                    )}
                </>
            )}

            {/* Task Dialog */}
            <TaskDialog
                open={dialogOpen}
                onClose={() => {
                    setDialogOpen(false);
                    setSelectedTask(null);
                }}
                onSubmit={handleDialogSubmit}
                onDelete={handleDeleteTask}
                task={selectedTask}
                isSaving={isSaving}
            />

            {/* Snackbar */}
            <Snackbar
                open={snackbar.open}
                autoHideDuration={4000}
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
        </Box>
    );
}
