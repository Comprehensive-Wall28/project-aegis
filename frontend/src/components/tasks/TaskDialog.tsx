import { useState, useEffect } from 'react';
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
} from '@mui/material';
import { Close as CloseIcon } from '@mui/icons-material';

const PRIORITY_OPTIONS = [
    { value: 'high', label: 'High', color: '#f44336' },
    { value: 'medium', label: 'Medium', color: '#ff9800' },
    { value: 'low', label: 'Low', color: '#4caf50' },
];

const STATUS_OPTIONS = [
    { value: 'todo', label: 'To Do' },
    { value: 'in_progress', label: 'In Progress' },
    { value: 'done', label: 'Done' },
];

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
    task?: any;
    isSaving?: boolean;
}

export const TaskDialog = ({ open, onClose, onSubmit, onDelete, task, isSaving }: TaskDialogProps) => {
    const theme = useTheme();
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [notes, setNotes] = useState('');
    const [dueDate, setDueDate] = useState('');
    const [priority, setPriority] = useState<'high' | 'medium' | 'low'>('medium');
    const [status, setStatus] = useState<'todo' | 'in_progress' | 'done'>('todo');

    const formatDateForInput = (dateInput: string | Date | undefined) => {
        if (!dateInput) return '';
        const d = new Date(dateInput);
        if (isNaN(d.getTime())) return '';

        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');

        return `${year}-${month}-${day}`;
    };

    useEffect(() => {
        if (task) {
            setTitle(task.title || '');
            setDescription(task.description || '');
            setNotes(task.notes || '');
            setDueDate(formatDateForInput(task.dueDate));
            setPriority(task.priority || 'medium');
            setStatus(task.status || 'todo');
        } else {
            setTitle('');
            setDescription('');
            setNotes('');
            setDueDate('');
            setPriority('medium');
            setStatus('todo');
        }
    }, [task, open]);

    const handleSubmit = () => {
        onSubmit({
            title,
            description,
            notes,
            dueDate: dueDate || undefined,
            priority,
            status,
        });
    };

    return (
        <Dialog
            open={open}
            onClose={onClose}
            fullWidth
            maxWidth="sm"
            PaperProps={{
                variant: 'glass',
                sx: {
                    borderRadius: '24px',
                    boxShadow: theme.shadows[20],
                }
            }}
        >
            <DialogTitle component="div" sx={{ m: 0, p: 2.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Typography variant="h6" sx={{ fontWeight: 700 }}>
                    {task?._id ? 'Edit Task' : 'New Encrypted Task'}
                </Typography>
                <IconButton onClick={onClose} size="small">
                    <CloseIcon />
                </IconButton>
            </DialogTitle>

            <DialogContent dividers sx={{ borderColor: alpha(theme.palette.divider, 0.1) }}>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, mt: 1 }}>
                    <TextField
                        label="Task Title"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        fullWidth
                        required
                        variant="outlined"
                        placeholder="What needs to be done?"
                        InputProps={{
                            sx: { borderRadius: '12px' }
                        }}
                    />

                    <TextField
                        label="Description"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        fullWidth
                        multiline
                        rows={3}
                        variant="outlined"
                        placeholder="Add more details..."
                        InputProps={{
                            sx: { borderRadius: '12px' }
                        }}
                    />

                    <Box sx={{ display: 'flex', gap: 2 }}>
                        <FormControl fullWidth sx={{ flex: 1 }}>
                            <InputLabel>Priority</InputLabel>
                            <Select
                                value={priority}
                                label="Priority"
                                onChange={(e) => setPriority(e.target.value as any)}
                                sx={{ borderRadius: '12px' }}
                                MenuProps={{
                                    PaperProps: {
                                        variant: 'glass',
                                        sx: {
                                            minWidth: 180,
                                            borderRadius: '12px',
                                            boxShadow: `0 8px 32px ${alpha(theme.palette.common.black, 0.3)}`,
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
                                value={status}
                                label="Status"
                                onChange={(e) => setStatus(e.target.value as any)}
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

                    <TextField
                        label="Due Date"
                        type="date"
                        value={dueDate}
                        onChange={(e) => setDueDate(e.target.value)}
                        fullWidth
                        InputLabelProps={{ shrink: true }}
                        InputProps={{
                            sx: { borderRadius: '12px', fontFamily: 'JetBrains Mono, monospace' }
                        }}
                    />

                    <TextField
                        label="Notes"
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        fullWidth
                        multiline
                        rows={2}
                        variant="outlined"
                        placeholder="Private notes (encrypted)..."
                        InputProps={{
                            sx: { borderRadius: '12px' }
                        }}
                    />
                </Box>
            </DialogContent>

            <DialogActions sx={{ p: 3, justifyContent: 'space-between' }}>
                <Box>
                    {task?._id && onDelete && (
                        <Button
                            onClick={() => onDelete(task._id)}
                            color="error"
                            sx={{ borderRadius: '12px', textTransform: 'none' }}
                        >
                            Delete Task
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
                        disabled={isSaving || !title.trim()}
                        sx={{
                            borderRadius: '12px',
                            px: 4,
                            textTransform: 'none',
                            fontWeight: 600,
                        }}
                    >
                        {isSaving ? 'Securing...' : (task?._id ? 'Update' : 'Create Task')}
                    </Button>
                </Box>
            </DialogActions>
        </Dialog>
    );
};
