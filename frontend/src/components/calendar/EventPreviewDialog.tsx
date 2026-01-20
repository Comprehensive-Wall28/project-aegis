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
    Event as CalendarIcon,
    LocationOn as LocationIcon,
    Description as DescriptionIcon,
    DeleteOutline as DeleteIcon,
    Schedule as TimeIcon,
    AccessTime as AllDayIcon,
    AssignmentOutlined as TaskIcon,
    EventOutlined as EventIcon,
} from '@mui/icons-material';
import dayjs from 'dayjs';
import { TaskDescriptionRenderer } from '../tasks/TaskDescriptionRenderer';
import { useBacklinks } from '../../hooks/useBacklinks';

interface EventPreviewDialogProps {
    open: boolean;
    onClose: () => void;
    onEdit: (event: any) => void;
    onDelete: (eventId: string) => void;
    event: any | null;
}

export const EventPreviewDialog = ({ open, onClose, onEdit, onDelete, event }: EventPreviewDialogProps) => {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
    const isMD = useMediaQuery(theme.breakpoints.down('md'));

    const backlinks = useBacklinks(event?._id || '');

    if (!event || !event._id) return null;

    const backgroundColor = event.color || theme.palette.primary.main;

    const formatFullDate = (dateString?: string) => {
        if (!dateString) return 'Not set';
        return dayjs(dateString).format('MMMM D, YYYY [at] h:mm A');
    };

    const formatDateRange = () => {
        if (!event.startDate || !event.endDate) return 'Not set';
        const start = dayjs(event.startDate);
        const end = dayjs(event.endDate);

        if (event.isAllDay) {
            if (start.isSame(end, 'day')) {
                return start.format('MMMM D, YYYY');
            }
            return `${start.format('MMM D')} - ${end.format('MMM D, YYYY')}`;
        }

        if (start.isSame(end, 'day')) {
            return `${start.format('MMMM D, YYYY')} · ${start.format('h:mm A')} - ${end.format('h:mm A')}`;
        }

        return `${start.format('MMM D, h:mm A')} - ${end.format('MMM D, h:mm A')}`;
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
                    border: `1px solid ${alpha(backgroundColor, 0.2)}`,
                    maxHeight: isMobile ? '100%' : '85vh',
                }
            }}
        >
            {/* Header */}
            <DialogTitle sx={{ p: 3, pb: 2, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 2 }}>
                <Box sx={{ flex: 1 }}>
                    <Typography variant="h5" sx={{ fontWeight: 700, mb: 1, color: theme.palette.text.primary, lineHeight: 1.2 }}>
                        {event.title}
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
                        <Chip
                            size="small"
                            label={event.isAllDay ? 'All Day' : 'Scheduled'}
                            icon={event.isAllDay ? <AllDayIcon sx={{ fontSize: '14px !important' }} /> : <TimeIcon sx={{ fontSize: '14px !important' }} />}
                            sx={{
                                bgcolor: alpha(backgroundColor, 0.1),
                                color: backgroundColor,
                                fontWeight: 600,
                            }}
                        />
                        {event.location && (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: 'text.secondary' }}>
                                <LocationIcon sx={{ fontSize: 16 }} />
                                <Typography variant="caption" sx={{ fontWeight: 500 }}>{event.location}</Typography>
                            </Box>
                        )}
                    </Box>
                </Box>
                <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button
                        variant="contained"
                        startIcon={<EditIcon />}
                        onClick={() => onEdit(event)}
                        sx={{
                            borderRadius: '12px',
                            textTransform: 'none',
                            fontWeight: 600,
                            boxShadow: 'none',
                            bgcolor: backgroundColor,
                            '&:hover': {
                                bgcolor: alpha(backgroundColor, 0.8),
                                boxShadow: 'none'
                            }
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
                    {/* Time Info */}
                    <Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5, color: theme.palette.text.secondary }}>
                            <CalendarIcon fontSize="small" />
                            <Typography variant="subtitle2" sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', fontSize: '0.75rem' }}>
                                Date & Time
                            </Typography>
                        </Box>
                        <Typography variant="body1" sx={{ fontWeight: 600, color: theme.palette.text.primary }}>
                            {formatDateRange()}
                        </Typography>
                    </Box>

                    {/* Description */}
                    <Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5, color: theme.palette.text.secondary }}>
                            <DescriptionIcon fontSize="small" />
                            <Typography variant="subtitle2" sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', fontSize: '0.75rem' }}>
                                Description
                            </Typography>
                        </Box>
                        {event.description ? (
                            <TaskDescriptionRenderer text={event.description} variant="body1" sx={{ color: theme.palette.text.primary }} />
                        ) : (
                            <Typography variant="body2" sx={{ fontStyle: 'italic', color: 'text.secondary', opacity: 0.6 }}>
                                No description provided.
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
                                <Typography variant="caption" color="text.secondary" sx={{ mb: 0.2, display: 'block' }}>Created</Typography>
                                <Typography variant="body2" sx={{ color: 'text.primary' }}>
                                    {formatFullDate(event.createdAt)}
                                </Typography>
                            </Box>
                            <Box>
                                <Typography variant="caption" color="text.secondary" sx={{ mb: 0.2, display: 'block' }}>Last Updated</Typography>
                                <Typography variant="body2" sx={{ color: 'text.primary' }}>
                                    {formatFullDate(event.updatedAt)}
                                </Typography>
                            </Box>
                        </Box>
                    </Box>

                    {backlinks.length > 0 && (
                        <Box>
                            <Typography variant="caption" sx={{ display: 'block', mb: 1, fontWeight: 700, color: theme.palette.text.secondary, textTransform: 'uppercase' }}>
                                Mentioned In
                            </Typography>
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                                {backlinks.map(link => (
                                    <Box
                                        key={link.id}
                                        sx={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 1,
                                            p: 1,
                                            borderRadius: '8px',
                                            bgcolor: alpha(theme.palette.text.primary, 0.03),
                                            border: `1px solid ${alpha(theme.palette.divider, 0.05)}`
                                        }}
                                    >
                                        {link.type === 'task' ? (
                                            <TaskIcon sx={{ fontSize: 16, color: theme.palette.secondary.main }} />
                                        ) : (
                                            <EventIcon sx={{ fontSize: 16, color: theme.palette.warning.main }} />
                                        )}
                                        <Typography variant="caption" sx={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                            {link.title}
                                        </Typography>
                                    </Box>
                                ))}
                            </Box>
                        </Box>
                    )}

                    <Box sx={{ mt: 'auto', pt: 2 }}>
                        <Button
                            fullWidth
                            color="error"
                            variant="outlined"
                            startIcon={<DeleteIcon />}
                            onClick={() => onDelete(event._id)}
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
                            Delete Event
                        </Button>
                    </Box>
                </Box>
            </DialogContent>
        </Dialog>
    );
};
