import { useState, useEffect, useCallback, useRef } from 'react';
import {
    Box,
    Typography,
    alpha,
    useTheme,
    Button,
    CircularProgress,
    Snackbar,
    Alert,
} from '@mui/material';
import {
    CheckCircle as TasksIcon,
    Add as AddIcon,
    Sort as SortIcon,
    DragIndicator,
    PriorityHigh,
    Event
} from '@mui/icons-material';
import { IconButton, Menu, MenuItem, Tooltip } from '@mui/material';
// No framer-motion imports needed here anymore
import { useSessionStore } from '@/stores/sessionStore';
import { useTaskStore } from '@/stores/useTaskStore';
import { useTaskEncryption } from '@/hooks/useTaskEncryption';
import { KanbanBoard } from '@/components/tasks/KanbanBoard';
import { TaskDialog, type TaskDialogData } from '@/components/tasks/TaskDialog';

type SnackbarState = {
    open: boolean;
    message: string;
    severity: 'success' | 'error' | 'info' | 'warning';
};

export function TasksPage() {
    const theme = useTheme();
    const pqcEngineStatus = useSessionStore((state) => state.pqcEngineStatus);

    const [sortMode, setSortMode] = useState<'manual' | 'priority' | 'date'>(() => {
        const saved = localStorage.getItem('kanban_sort_mode');
        return (saved as any) || 'manual';
    });
    const [sortAnchorEl, setSortAnchorEl] = useState<null | HTMLElement>(null);

    const handleSortClick = (event: React.MouseEvent<HTMLElement>) => {
        setSortAnchorEl(event.currentTarget);
    };

    const handleSortClose = (mode?: 'manual' | 'priority' | 'date') => {
        if (mode) {
            setSortMode(mode);
            localStorage.setItem('kanban_sort_mode', mode);
        }
        setSortAnchorEl(null);
    };

    const tasks = useTaskStore((state) => state.tasks);
    const isLoading = useTaskStore((state) => state.isLoading);
    const fetchTasks = useTaskStore((state) => state.fetchTasks);
    const addTask = useTaskStore((state) => state.addTask);
    const updateTask = useTaskStore((state) => state.updateTask);
    const deleteTask = useTaskStore((state) => state.deleteTask);
    const reorderTasks = useTaskStore((state) => state.reorderTasks);

    const { encryptTaskData, decryptTasks, decryptTaskData, generateRecordHash } = useTaskEncryption();

    const [dialogOpen, setDialogOpen] = useState(false);
    const [selectedTask, setSelectedTask] = useState<any>(null);
    const [isSaving, setIsSaving] = useState(false);
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
            fetchTasks(undefined, decryptTasks);
        }
    }, [pqcEngineStatus, fetchTasks, decryptTasks]);

    const handleAddTask = useCallback((status: 'todo' | 'in_progress' | 'done' = 'todo') => {
        // @ts-ignore - _tempId is local only for key generation
        setSelectedTask({ status, _tempId: Date.now() });
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
        } catch (error: any) {
            showSnackbar(error.message || 'Failed to delete task', 'error');
        } finally {
            setIsSaving(false);
        }
    };

    const handleTaskMove = async (updates: { id: string; status: any; order: number }[]) => {
        try {
            // reorderTasks in taskStore handles optimistic update and backend sync
            await reorderTasks(updates);
            showSnackbar('Board updated', 'success');
        } catch (error: any) {
            showSnackbar(error.message || 'Failed to sync reorder', 'error');
        }
    };


    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, height: '100%' }}>
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
                        PQC-encrypted task management
                    </Typography>
                </Box>

                {pqcEngineStatus === 'operational' && !isLoading && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
                        {/* Sort Control */}
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 500, display: { xs: 'none', sm: 'block' } }}>
                                Sort by: <strong>{sortMode === 'manual' ? 'Manual' : sortMode === 'priority' ? 'Priority' : 'Due Date'}</strong>
                            </Typography>
                            <Tooltip title="Sort Tasks">
                                <IconButton
                                    size="small"
                                    onClick={handleSortClick}
                                    sx={{
                                        bgcolor: alpha(theme.palette.primary.main, 0.1),
                                        color: theme.palette.primary.main,
                                        '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.2) }
                                    }}
                                >
                                    <SortIcon fontSize="small" />
                                </IconButton>
                            </Tooltip>
                            <Menu
                                anchorEl={sortAnchorEl}
                                open={Boolean(sortAnchorEl)}
                                onClose={() => handleSortClose()}
                                PaperProps={{
                                    sx: {
                                        mt: 1,
                                        minWidth: 180,
                                        borderRadius: '12px',
                                        boxShadow: `0 8px 32px ${alpha(theme.palette.common.black, 0.3)}`,
                                        border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                                    }
                                }}
                            >
                                <MenuItem onClick={() => handleSortClose('manual')} selected={sortMode === 'manual'} sx={{ gap: 1, borderRadius: '8px', mx: 1, my: 0.5 }}>
                                    <DragIndicator fontSize="small" /> Manual
                                </MenuItem>
                                <MenuItem onClick={() => handleSortClose('priority')} selected={sortMode === 'priority'} sx={{ gap: 1, borderRadius: '8px', mx: 1, my: 0.5 }}>
                                    <PriorityHigh fontSize="small" /> Priority
                                </MenuItem>
                                <MenuItem onClick={() => handleSortClose('date')} selected={sortMode === 'date'} sx={{ gap: 1, borderRadius: '8px', mx: 1, my: 0.5 }}>
                                    <Event fontSize="small" /> Due Date
                                </MenuItem>
                            </Menu>
                        </Box>

                        {/* Add Task Button */}
                        <Button
                            variant="contained"
                            startIcon={<AddIcon />}
                            onClick={(e) => {
                                e.currentTarget.blur();
                                handleAddTask('todo');
                            }}
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
                        flex: 1,
                        minHeight: 300,
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
                <Box
                    sx={{
                        flex: 1,
                        minHeight: 0,
                        display: 'flex',
                        flexDirection: 'column',
                    }}
                >
                    <KanbanBoard
                        tasks={tasks}
                        onTaskClick={handleTaskClick}
                        onAddTask={handleAddTask}
                        onTaskMove={handleTaskMove}
                        sortMode={sortMode}
                    />
                </Box>
            )}

            {/* Task Dialog */}
            <TaskDialog
                open={dialogOpen}
                onClose={() => {
                    setDialogOpen(false);
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
