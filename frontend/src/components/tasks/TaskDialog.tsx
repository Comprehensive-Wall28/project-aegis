import { useState, useEffect, useCallback, memo } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    TextField,
    Box,
    Typography,
    IconButton,
    alpha,
    useTheme,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    useMediaQuery,
    type SelectChangeEvent,
} from '@mui/material';
import { Close as CloseIcon } from '@mui/icons-material';
import { MobileDateTimePicker } from '@mui/x-date-pickers/MobileDateTimePicker';
import dayjs from 'dayjs';
import type { Task } from '../../services/taskService';

const PRIORITY_OPTIONS = [
    { value: 'high', label: 'High', color: '#f44336' },
    { value: 'medium', label: 'Medium', color: '#ff9800' },
    { value: 'low', label: 'Low', color: '#4caf50' },
] as const;

const STATUS_OPTIONS = [
    { value: 'todo', label: 'To Do' },
    { value: 'in_progress', label: 'In Progress' },
    { value: 'done', label: 'Done' },
] as const;

export interface TaskDialogData {
    title: string;
    description: string;
    notes: string;
    dueDate?: string;
    priority: 'high' | 'medium' | 'low';
    status: 'todo' | 'in_progress' | 'done';
}

export interface TaskDialogProps {
    open: boolean;
    onClose: () => void;
    onSubmit: (data: TaskDialogData) => void;
    onDelete?: (id: string) => void;
    task?: Task | null;
    isSaving?: boolean;
}

const formatDateForInput = (dateInput: string | Date | undefined) => {
    if (!dateInput) return '';
    const d = dayjs(dateInput);
    return d.isValid() ? d.toISOString() : '';
};

export const TaskDialog = memo(({ open, onClose, onSubmit, onDelete, task, isSaving }: TaskDialogProps) => {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
    const [isPickerOpen, setIsPickerOpen] = useState(false);

    // Group state to avoid cascading updates notification and simplify management
    const [formData, setFormData] = useState<TaskDialogData>({
        title: '',
        description: '',
        notes: '',
        dueDate: '',
        priority: 'medium',
        status: 'todo',
    });

    useEffect(() => {
        if (open) {
            if (task) {
                setFormData({
                    title: task.title || '',
                    description: task.description || '',
                    notes: task.notes || '',
                    dueDate: formatDateForInput(task.dueDate),
                    priority: task.priority || 'medium',
                    status: task.status || 'todo',
                });
            } else {
                setFormData({
                    title: '',
                    description: '',
                    notes: '',
                    dueDate: '',
                    priority: 'medium',
                    status: 'todo',
                });
            }
        }
    }, [task, open]);

    const handleChange = (field: keyof TaskDialogData) => (
        e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | SelectChangeEvent
    ) => {
        setFormData(prev => ({
            ...prev,
            [field]: e.target.value
        }));
    };

    const handleSubmit = useCallback(() => {
        if (!formData.title.trim()) return;
        onSubmit({
            ...formData,
            dueDate: formData.dueDate || undefined,
        });
    }, [formData, onSubmit]);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSubmit();
        }
    };

    return (
        <Dialog
            open={open}
            onClose={onClose}
            fullWidth
            maxWidth="sm"
            fullScreen={isMobile}
            disableEnforceFocus={isPickerOpen}
            PaperProps={{
                variant: 'solid',
                sx: {
                    borderRadius: isMobile ? 0 : '24px',
                    boxShadow: theme.shadows[20],
                    backgroundImage: 'none',
                    bgcolor: theme.palette.background.paper,
                }
            }}
        >
            <DialogTitle
                component="div"
                sx={{
                    m: 0,
                    p: isMobile ? 2 : 2.5,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    borderBottom: isMobile ? `1px solid ${alpha(theme.palette.divider, 0.1)}` : 'none'
                }}
            >
                <Typography variant="h6" sx={{ fontWeight: 700 }}>
                    {task?._id ? 'Edit Task' : 'New Encrypted Task'}
                </Typography>
                <IconButton onClick={onClose} size="small" edge="end">
                    <CloseIcon />
                </IconButton>
            </DialogTitle>

            <DialogContent
                dividers={!isMobile}
                sx={{
                    borderColor: alpha(theme.palette.divider, 0.1),
                    p: isMobile ? 2 : 2.5,
                }}
            >
                <Box
                    component="form"
                    onKeyDown={(e) => {
                        // Allow Enter to submit only if not in multiline fields
                        if (e.target instanceof HTMLTextAreaElement) return;
                        handleKeyDown(e);
                    }}
                    sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, mt: isMobile ? 1 : 0 }}
                >
                    <TextField
                        autoFocus
                        label="Task Title *"
                        value={formData.title}
                        onChange={handleChange('title')}
                        fullWidth
                        required
                        variant="outlined"
                        placeholder="What needs to be done?"
                        slotProps={{
                            input: { sx: { borderRadius: '12px' } }
                        }}
                    />

                    <TextField
                        label="Description"
                        value={formData.description}
                        onChange={handleChange('description')}
                        fullWidth
                        multiline
                        minRows={3}
                        maxRows={8}
                        variant="outlined"
                        placeholder="Add more details..."
                        slotProps={{
                            input: { sx: { borderRadius: '12px' } }
                        }}
                    />

                    <Box sx={{ display: 'flex', gap: 2, flexDirection: isMobile ? 'column' : 'row' }}>
                        <FormControl fullWidth sx={{ flex: 1 }}>
                            <InputLabel>Priority</InputLabel>
                            <Select
                                value={formData.priority}
                                label="Priority"
                                onChange={(e) => handleChange('priority')(e as SelectChangeEvent)}
                                sx={{ borderRadius: '12px' }}
                                MenuProps={{
                                    PaperProps: {
                                        sx: {
                                            minWidth: 180,
                                            borderRadius: '12px',
                                            boxShadow: theme.shadows[10],
                                            bgcolor: theme.palette.background.paper,
                                        }
                                    }
                                }}
                            >
                                {PRIORITY_OPTIONS.map((opt) => (
                                    <MenuItem key={opt.value} value={opt.value}>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                            <Box
                                                sx={{
                                                    width: 12,
                                                    height: 12,
                                                    borderRadius: '50%',
                                                    bgcolor: opt.color,
                                                }}
                                            />
                                            {opt.label}
                                        </Box>
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>

                        <FormControl fullWidth sx={{ flex: 1 }}>
                            <InputLabel>Status</InputLabel>
                            <Select
                                value={formData.status}
                                label="Status"
                                onChange={(e) => handleChange('status')(e as SelectChangeEvent)}
                                sx={{ borderRadius: '12px' }}
                            >
                                {STATUS_OPTIONS.map((opt) => (
                                    <MenuItem key={opt.value} value={opt.value}>
                                        {opt.label}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    </Box>

                    <MobileDateTimePicker
                        label="Due Date"
                        value={formData.dueDate ? dayjs(formData.dueDate) : null}
                        onOpen={() => setIsPickerOpen(true)}
                        onClose={() => setIsPickerOpen(false)}
                        onChange={(newValue) => {
                            setFormData(prev => ({
                                ...prev,
                                dueDate: newValue ? (newValue as dayjs.Dayjs).toISOString() : ''
                            }));
                        }}
                        slotProps={{
                            textField: {
                                fullWidth: true,
                                variant: 'outlined',
                                sx: {
                                    '& .MuiOutlinedInput-root': {
                                        borderRadius: '12px',
                                    },
                                    '& .MuiInputLabel-root': {
                                        fontFamily: 'inherit'
                                    }
                                }
                            },
                            dialog: {
                                sx: {
                                    '& .MuiPaper-root': {
                                        borderRadius: '24px',
                                        bgcolor: theme.palette.background.paper,
                                        backgroundImage: 'none',
                                        boxShadow: theme.shadows[20],
                                    }
                                }
                            }
                        }}
                    />

                    <TextField
                        label="Notes"
                        value={formData.notes}
                        onChange={handleChange('notes')}
                        fullWidth
                        multiline
                        minRows={2}
                        maxRows={6}
                        variant="outlined"
                        placeholder="Private notes (encrypted)..."
                        slotProps={{
                            input: { sx: { borderRadius: '12px' } }
                        }}
                    />
                </Box>
            </DialogContent>

            <DialogActions sx={{ p: isMobile ? 2 : 3, justifyContent: 'space-between', borderTop: isMobile ? `1px solid ${alpha(theme.palette.divider, 0.1)}` : 'none' }}>
                <Box>
                    {task?._id && onDelete && (
                        <Button
                            onClick={() => onDelete(task._id)}
                            color="error"
                            sx={{ borderRadius: '12px', textTransform: 'none' }}
                        >
                            Delete
                        </Button>
                    )}
                </Box>
                <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button onClick={onClose} sx={{ borderRadius: '12px', textTransform: 'none' }}>
                        Cancel
                    </Button>
                    <Button
                        onClick={handleSubmit}
                        variant="contained"
                        disabled={isSaving || !formData.title.trim()}
                        sx={{
                            borderRadius: '12px',
                            px: isMobile ? 3 : 4,
                            textTransform: 'none',
                            fontWeight: 600,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 1
                        }}
                    >
                        {isSaving ? 'Saving...' : (task?._id ? 'Update' : 'Create')}
                        {!isMobile && (
                            <Box
                                component="span"
                                sx={{
                                    fontSize: '0.7rem',
                                    bgcolor: 'rgba(255, 255, 255, 0.12)',
                                    px: 1,
                                    py: 0.4,
                                    borderRadius: '6px',
                                    fontWeight: 600,
                                    border: '1px solid rgba(255, 255, 255, 0.2)',
                                    borderBottomWidth: '2px', // Depth effect
                                    ml: 1,
                                    lineHeight: 1,
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 0.5,
                                    boxShadow: '0 2px 0 rgba(0,0,0,0.1)',
                                    opacity: 0.9,
                                }}
                            >
                                <Typography component="span" sx={{ fontSize: '0.8rem', fontWeight: 800 }}>↵</Typography>
                                Enter
                            </Box>
                        )}
                    </Button>
                </Box>
            </DialogActions>
        </Dialog>
    );
});
