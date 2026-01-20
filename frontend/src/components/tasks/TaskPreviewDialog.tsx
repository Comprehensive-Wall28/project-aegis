import { memo } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    Box,
    Typography,
    IconButton,
    Button,
    alpha,
    useTheme,
    useMediaQuery,
    Chip,
    Divider,
} from '@mui/material';
import {
    Close as CloseIcon,
    Edit as EditIcon,
    CalendarToday as CalendarIcon,
    PriorityHigh as PriorityIcon,
    Info as StatusIcon,
    Description as DescriptionIcon,
    Notes as NotesIcon,
    DeleteOutline as DeleteIcon,
} from '@mui/icons-material';
import dayjs from 'dayjs';
import type { DecryptedTask } from '@/stores/useTaskStore';
import { TASK_PRIORITY_CONFIG, TASK_STATUS_LABELS } from '@/constants/taskDefaults';
import { TaskDescriptionRenderer } from './TaskDescriptionRenderer';

interface TaskPreviewDialogProps {
    open: boolean;
    onClose: () => void;
    onEdit: (task: DecryptedTask) => void;
    onDelete: (taskId: string) => void;
    task: DecryptedTask | null;
}

export const TaskPreviewDialog = memo(({ open, onClose, onEdit, onDelete, task }: TaskPreviewDialogProps) => {
    if (!task || !task._id) return null;

    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
    const isMD = useMediaQuery(theme.breakpoints.down('md'));

    const priorityConfig = TASK_PRIORITY_CONFIG[task.priority];
    const statusLabel = TASK_STATUS_LABELS[task.status];

    const formatFullDate = (dateString?: string) => {
        if (!dateString) return 'Not set';
        return dayjs(dateString).format('MMMM D, YYYY [at] h:mm A');
    };

    return (
        <Dialog
            open={open}
            onClose={onClose}
            fullWidth
            maxWidth="md"
            fullScreen={isMobile}
            PaperProps={{
                sx: {
                    borderRadius: isMobile ? 0 : '24px',
                    backgroundImage: 'none',
                    bgcolor: theme.palette.background.paper,
                    boxShadow: theme.shadows[20],
                    border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
                    maxHeight: isMobile ? '100%' : '85vh',
                }
            }}
        >
            {/* Header */}
            <DialogTitle sx={{ p: 3, pb: 2, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 2 }}>
                <Box sx={{ flex: 1 }}>
                    <Typography variant="h5" sx={{ fontWeight: 700, mb: 1, color: theme.palette.text.primary, lineHeight: 1.2 }}>
                        {task.title}
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                        <Chip
                            size="small"
                            label={statusLabel}
                            icon={<StatusIcon sx={{ fontSize: '14px !important' }} />}
                            sx={{
                                bgcolor: alpha(theme.palette.primary.main, 0.1),
                                color: theme.palette.primary.main,
                                fontWeight: 600,
                            }}
                        />
                        <Chip
                            size="small"
                            label={priorityConfig.label}
                            icon={<PriorityIcon sx={{ fontSize: '14px !important' }} />}
                            sx={{
                                bgcolor: alpha(priorityConfig.color, 0.1),
                                color: priorityConfig.color,
                                fontWeight: 600,
                            }}
                        />
                    </Box>
                </Box>
                <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button
                        variant="contained"
                        startIcon={<EditIcon />}
                        onClick={() => onEdit(task)}
                        sx={{
                            borderRadius: '12px',
                            textTransform: 'none',
                            fontWeight: 600,
                            boxShadow: 'none',
                            '&:hover': { boxShadow: 'none' }
                        }}
                    >
                        Edit
                    </Button>
                    <IconButton
                        onClick={onClose}
                        size="small"
                        sx={{
                            width: 36,
                            height: 36,
                            bgcolor: alpha(theme.palette.action.active, 0.05),
                            '&:hover': {
                                bgcolor: alpha(theme.palette.action.active, 0.1),
                            }
                        }}
                    >
                        <CloseIcon fontSize="small" />
                    </IconButton>
                </Box>
            </DialogTitle>

            <Divider sx={{ borderColor: alpha(theme.palette.text.primary, 0.1) }} />

            <DialogContent sx={{ p: 0, display: 'flex', flexDirection: isMD ? 'column' : 'row', overflow: 'hidden' }}>
                {/* Main Content */}
                <Box sx={{ flex: 1, p: 3, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {/* Description */}
                    <Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5, color: theme.palette.text.secondary }}>
                            <DescriptionIcon fontSize="small" />
                            <Typography variant="subtitle2" sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', fontSize: '0.75rem' }}>
                                Description
                            </Typography>
                        </Box>
                        {task.description ? (
                            <TaskDescriptionRenderer text={task.description} variant="body1" sx={{ color: theme.palette.text.primary }} />
                        ) : (
                            <Typography variant="body2" sx={{ fontStyle: 'italic', color: 'text.secondary', opacity: 0.6 }}>
                                No description provided.
                            </Typography>
                        )}
                    </Box>

                    {/* Notes */}
                    <Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5, color: theme.palette.text.secondary }}>
                            <NotesIcon fontSize="small" />
                            <Typography variant="subtitle2" sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', fontSize: '0.75rem' }}>
                                Private Notes
                            </Typography>
                        </Box>
                        {task.notes ? (
                            <Box sx={{ p: 2, borderRadius: '12px', bgcolor: alpha(theme.palette.warning.main, 0.05), border: `1px solid ${alpha(theme.palette.warning.main, 0.1)}` }}>
                                <TaskDescriptionRenderer text={task.notes} variant="body2" sx={{ color: theme.palette.text.primary }} />
                            </Box>
                        ) : (
                            <Typography variant="body2" sx={{ fontStyle: 'italic', color: 'text.secondary', opacity: 0.6 }}>
                                No private notes.
                            </Typography>
                        )}
                    </Box>
                </Box>

                {/* Sidebar Metadata */}
                <Box sx={{
                    width: isMD ? '100%' : 280,
                    bgcolor: alpha(theme.palette.background.paper, 0.4),
                    borderLeft: isMD ? 'none' : `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                    borderTop: isMD ? `1px solid ${alpha(theme.palette.divider, 0.1)}` : 'none',
                    p: 3,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 3
                }}>
                    <Box>
                        <Typography variant="caption" sx={{ display: 'block', mb: 1, fontWeight: 700, color: theme.palette.text.secondary, textTransform: 'uppercase' }}>
                            Metadata
                        </Typography>
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                            <Box>
                                <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.2 }}>
                                    <CalendarIcon sx={{ fontSize: 12 }} /> Due Date
                                </Typography>
                                <Typography variant="body2" sx={{ fontWeight: 600, color: task.dueDate ? (dayjs(task.dueDate).isBefore(dayjs()) ? theme.palette.error.main : 'text.primary') : 'text.secondary' }}>
                                    {task.dueDate ? dayjs(task.dueDate).format('MMM D, YYYY') : 'None'}
                                </Typography>
                            </Box>
                            <Box>
                                <Typography variant="caption" color="text.secondary" sx={{ mb: 0.2, display: 'block' }}>Created</Typography>
                                <Typography variant="body2" sx={{ color: 'text.primary' }}>
                                    {formatFullDate(task.createdAt)}
                                </Typography>
                            </Box>
                            <Box>
                                <Typography variant="caption" color="text.secondary" sx={{ mb: 0.2, display: 'block' }}>Last Updated</Typography>
                                <Typography variant="body2" sx={{ color: 'text.primary' }}>
                                    {formatFullDate(task.updatedAt)}
                                </Typography>
                            </Box>
                        </Box>
                    </Box>

                    <Box sx={{ mt: 'auto', pt: 2 }}>
                        <Button
                            fullWidth
                            color="error"
                            variant="outlined"
                            startIcon={<DeleteIcon />}
                            onClick={() => onDelete(task._id)}
                            sx={{
                                borderRadius: '12px',
                                textTransform: 'none',
                                borderColor: alpha(theme.palette.error.main, 0.2),
                                '&:hover': {
                                    bgcolor: alpha(theme.palette.error.main, 0.05),
                                    borderColor: theme.palette.error.main,
                                }
                            }}
                        >
                            Delete Task
                        </Button>
                    </Box>
                </Box>
            </DialogContent>
        </Dialog>
    );
});
