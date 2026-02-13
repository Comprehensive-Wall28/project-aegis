import { useState, useCallback, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { extractMentionedIds } from '@/utils/mentionUtils';
import type { DecryptedTask } from '@/stores/useTaskStore';
import {
    Box,
    Typography,
    alpha,
    useTheme,
    Button,
    CircularProgress,
    Snackbar,
    Alert,
    TextField,
    InputAdornment,
} from '@mui/material';
import {
    CheckCircle as TasksIcon,
    Add as AddIcon,
    Sort as SortIcon,
    DragIndicator,
    PriorityHigh,
    Event,
    Search as SearchIcon,
    Close as CloseIcon,
} from '@mui/icons-material';
import { IconButton, Menu, MenuItem, Tooltip } from '@mui/material';
// No framer-motion imports needed here anymore
import { useSessionStore } from '@/stores/sessionStore';
import { useTaskStore } from '@/stores/useTaskStore';
import { useTaskEncryption } from '@/hooks/useTaskEncryption';
import { KanbanBoard } from '@/components/tasks/KanbanBoard';
import { TaskDialog, type TaskDialogData } from '@/components/tasks/TaskDialog';
import { TaskPreviewDialog } from '@/components/tasks/TaskPreviewDialog';


type SnackbarState = {
    open: boolean;
    message: string;
    severity: 'success' | 'error' | 'info' | 'warning';
};

export function TasksPage() {
    const theme = useTheme();
    const pqcEngineStatus = useSessionStore((state) => state.pqcEngineStatus);

    // Fetch full task list on mount (global hydration only fetches upcoming tasks for dashboard)
    const fetchTasks = useTaskStore((state) => state.fetchTasks);
    const { decryptTasks } = useTaskEncryption();

    useEffect(() => {
        if (pqcEngineStatus === 'operational') {
            fetchTasks(undefined, decryptTasks).catch(err => {
                console.error('[TasksPage] Failed to fetch tasks:', err);
            });
        }
    }, [pqcEngineStatus, fetchTasks, decryptTasks]);

    const [sortMode, setSortMode] = useState<'manual' | 'priority' | 'date'>(() => {
        const saved = localStorage.getItem('kanban_sort_mode');
        return (saved === 'manual' || saved === 'priority' || saved === 'date') ? saved : 'manual';
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
    const addTask = useTaskStore((state) => state.addTask);
    const updateTask = useTaskStore((state) => state.updateTask);
    const deleteTask = useTaskStore((state) => state.deleteTask);
    const reorderTasks = useTaskStore((state) => state.reorderTasks);

    const [searchTerm, setSearchTerm] = useState('');

    const filteredTasks = useMemo(() => {
        if (!searchTerm.trim()) return tasks;
        const lowerTerm = searchTerm.toLowerCase();
        return tasks.filter((t) =>
            t.title.toLowerCase().includes(lowerTerm) ||
            (t.description && t.description.toLowerCase().includes(lowerTerm)) ||
            (t.notes && t.notes.toLowerCase().includes(lowerTerm)) ||
            t.priority.toLowerCase().includes(lowerTerm)
        );
    }, [tasks, searchTerm]);

    const { encryptTaskData, decryptTaskData, generateRecordHash } = useTaskEncryption();

    const [isSaving, setIsSaving] = useState(false);
    const [deleteStatus, setDeleteStatus] = useState<'idle' | 'deleting' | 'success' | 'error'>('idle');

    const [snackbar, setSnackbar] = useState<SnackbarState>({
        open: false,
        message: '',
        severity: 'success',
    });

    const [searchParams, setSearchParams] = useSearchParams();

    const urlTaskId = searchParams.get('task');
    const urlEditId = searchParams.get('edit');
    const urlNewStatus = searchParams.get('new') as 'todo' | 'in_progress' | 'done' | null;

    const dialogOpen = !!urlEditId || !!urlNewStatus;
    const previewOpen = !!urlTaskId && !dialogOpen;

    // Derived type for task state (full task or status template)
    type TaskState = DecryptedTask | { status: 'todo' | 'in_progress' | 'done'; _id?: undefined; _tempId?: number; title?: string; description?: string; notes?: string; priority?: 'high' | 'medium' | 'low'; dueDate?: string };

    const intentTask = useMemo<TaskState | null>(() => {
        if (urlEditId) {
            return tasks.find(t => t._id === urlEditId) || null;
        } else if (urlNewStatus) {
            return { status: urlNewStatus, _tempId: Date.now() };
        } else if (urlTaskId) {
            return tasks.find(t => t._id === urlTaskId) || null;
        }
        return null;
    }, [urlEditId, urlNewStatus, urlTaskId, tasks]);

    // PRESERVE state during closing transition to prevent "flicker"
    const [stickyTask, setStickyTask] = useState<TaskState | null>(null);
    if (intentTask && intentTask !== stickyTask) {
        setStickyTask(intentTask);
    }

    const selectedTask = intentTask || stickyTask;

    const updateTaskParams = useCallback((updates: Record<string, string | null>) => {
        setSearchParams(prev => {
            const next = new URLSearchParams(prev);
            Object.entries(updates).forEach(([key, value]) => {
                if (value === null) {
                    next.delete(key);
                } else {
                    // Mutual exclusivity for core task views
                    if (['task', 'edit', 'new'].includes(key)) {
                        ['task', 'edit', 'new'].forEach(k => { if (k !== key) next.delete(k); });
                    }
                    next.set(key, value);
                }
            });
            return next;
        }, { replace: true });
    }, [setSearchParams]);

    const showSnackbar = (message: string, severity: SnackbarState['severity']) => {
        setSnackbar({ open: true, message, severity });
    };

    const handleAddTask = useCallback((status: 'todo' | 'in_progress' | 'done' = 'todo') => {
        updateTaskParams({ new: status });
    }, [updateTaskParams]);

    const handleTaskClick = useCallback((task: { _id?: string; id?: string }) => {
        updateTaskParams({ task: task._id || task.id || '' });
    }, [updateTaskParams]);

    const handleEditFromPreview = useCallback((task: { _id?: string; id?: string }) => {
        updateTaskParams({ edit: task._id || task.id || '' });
    }, [updateTaskParams]);

    const handleDialogSubmit = useCallback(async (data: TaskDialogData) => {
        if (pqcEngineStatus !== 'operational') {
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

            // Extract mentions for backend indexing
            const mentions = extractMentionedIds(`${data.description} ${data.notes}`);

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
                    decryptTaskData,
                    mentions
                );
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
                    decryptTaskData,
                    mentions
                );
            }

            updateTaskParams({ edit: null, new: null });
        } catch (error: unknown) {
            const message = (error instanceof Error) ? error.message : 'Operation failed';
            showSnackbar(message, 'error');
        } finally {
            setIsSaving(false);
        }
    }, [pqcEngineStatus, generateRecordHash, encryptTaskData, selectedTask, updateTask, decryptTaskData, addTask]);

    const handleDeleteTask = useCallback(async (taskId: string) => {
        try {
            setIsSaving(true);
            setDeleteStatus('deleting');
            await deleteTask(taskId);
            setDeleteStatus('success');

            // Revert status to idle after delay
            setTimeout(() => {
                setDeleteStatus('idle');
            }, 2000);

            updateTaskParams({ task: null, edit: null });
        } catch (error: unknown) {
            setDeleteStatus('error');
            const message = (error instanceof Error) ? error.message : 'Failed to delete task';
            showSnackbar(message, 'error');

            // Revert status to idle after delay
            setTimeout(() => {
                setDeleteStatus('idle');
            }, 3000);
        } finally {
            setIsSaving(false);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps -- updateTaskParams is stable (no deps change)
    }, [deleteTask]);

    const handleTaskMove = useCallback(async (updates: { id: string; status: 'todo' | 'in_progress' | 'done'; order: number }[]) => {
        try {
            // reorderTasks in taskStore handles optimistic update and backend sync
            await reorderTasks(updates);
        } catch (error: unknown) {
            const message = (error instanceof Error) ? error.message : 'Failed to sync reorder';
            showSnackbar(message, 'error');
        }
    }, [reorderTasks]);


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
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap', width: { xs: '100%', md: 'auto' } }}>
                        {/* Sort Control */}
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1, width: { xs: '100%', md: 'auto' } }}>
                            <TextField
                                size="small"
                                placeholder="Search tasks..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                sx={{
                                    width: { xs: '100%', md: 220 },
                                    flex: { xs: 1, md: 'none' },
                                    '& .MuiOutlinedInput-root': {
                                        borderRadius: '12px',
                                        bgcolor: alpha(theme.palette.background.paper, 0.5),
                                        '& fieldset': {
                                            borderColor: alpha(theme.palette.text.primary, 0.2),
                                            borderWidth: '1px',
                                        },
                                        '&:hover fieldset': {
                                            borderColor: alpha(theme.palette.primary.main, 0.4),
                                        },
                                        '&.Mui-focused fieldset': {
                                            borderColor: theme.palette.primary.main,
                                        },
                                    },
                                }}
                                InputProps={{
                                    startAdornment: (
                                        <InputAdornment position="start">
                                            <SearchIcon fontSize="small" color="action" />
                                        </InputAdornment>
                                    ),
                                    endAdornment: searchTerm ? (
                                        <InputAdornment position="end">
                                            <IconButton
                                                size="small"
                                                onClick={() => setSearchTerm('')}
                                                edge="end"
                                                sx={{ color: 'text.secondary' }}
                                            >
                                                <CloseIcon fontSize="small" />
                                            </IconButton>
                                        </InputAdornment>
                                    ) : null,
                                }}
                            />

                            <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 500, display: { xs: 'none', sm: 'block' }, ml: 1 }}>
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
                                slotProps={{
                                    paper: {
                                        sx: {
                                            mt: 1,
                                            minWidth: 180,
                                            borderRadius: '12px',
                                            boxShadow: `0 8px 32px ${alpha(theme.palette.common.black, 0.3)}`,
                                            border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                                        }
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
                                width: { xs: '100%', md: 'auto' },
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
                        tasks={filteredTasks}
                        onTaskClick={handleTaskClick}
                        onAddTask={handleAddTask}
                        onTaskMove={(updates) => handleTaskMove(updates as { id: string; status: 'todo' | 'in_progress' | 'done'; order: number }[])}
                        onDeleteTask={handleDeleteTask}
                        sortMode={sortMode}
                        isDragDisabled={!!searchTerm.trim()}
                        deleteStatus={deleteStatus}
                    />
                </Box>
            )}

            {/* Task Dialog */}
            <TaskDialog
                open={dialogOpen}
                onClose={() => updateTaskParams({ edit: null, new: null })}
                onSubmit={handleDialogSubmit}
                onDelete={handleDeleteTask}
                task={selectedTask as DecryptedTask}
                isSaving={isSaving}
            />

            {/* Task Preview Dialog */}
            <TaskPreviewDialog
                open={previewOpen}
                onClose={() => updateTaskParams({ task: null })}
                onEdit={handleEditFromPreview}
                onDelete={handleDeleteTask}
                task={selectedTask as DecryptedTask}
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
