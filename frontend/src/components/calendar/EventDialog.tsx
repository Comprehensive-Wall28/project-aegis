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
    FormControlLabel,
    Checkbox,
} from '@mui/material';
import { Close as CloseIcon, Palette as PaletteIcon } from '@mui/icons-material';

const AEGIS_COLORS = [
    { name: 'Primary Blue', value: '#3f51b5' },
    { name: 'Success Green', value: '#4caf50' },
    { name: 'Warning Amber', value: '#ff9800' },
    { name: 'Post-Quantum Purple', value: '#9c27b0' },
    { name: 'Quantum Slate', value: '#607d8b' },
];

export interface EventDialogProps {
    open: boolean;
    onClose: () => void;
    onSubmit: (data: any) => void;
    onDelete?: (id: string) => void;
    event?: any; // If editing
    isSaving?: boolean;
}

export const EventDialog = ({ open, onClose, onSubmit, onDelete, event, isSaving }: EventDialogProps) => {
    const theme = useTheme();
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [location, setLocation] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [isAllDay, setIsAllDay] = useState(false);
    const [color, setColor] = useState(AEGIS_COLORS[0].value);

    useEffect(() => {
        if (event) {
            setTitle(event.title || '');
            setDescription(event.description || '');
            setLocation(event.location || '');
            setStartDate(event.start ? new Date(event.start).toISOString().slice(0, 16) : '');
            setEndDate(event.end ? new Date(event.end).toISOString().slice(0, 16) : '');
            setIsAllDay(event.allDay || false);
            setColor(event.color || AEGIS_COLORS[0].value);
        } else {
            // Reset for new event
            setTitle('');
            setDescription('');
            setLocation('');
            setStartDate(new Date().toISOString().slice(0, 16));
            setEndDate(new Date(Date.now() + 3600000).toISOString().slice(0, 16));
            setIsAllDay(false);
            setColor(AEGIS_COLORS[0].value);
        }
    }, [event, open]);

    const handleSubmit = () => {
        onSubmit({
            title,
            description,
            location,
            startDate,
            endDate,
            isAllDay,
            color,
        });
    };

    return (
        <Dialog
            open={open}
            onClose={onClose}
            fullWidth
            maxWidth="sm"
            PaperProps={{
                sx: {
                    borderRadius: '24px',
                    bgcolor: alpha(theme.palette.background.paper, 0.8),
                    backdropFilter: 'blur(16px)',
                    border: `1px solid ${alpha(theme.palette.common.white, 0.1)}`,
                    boxShadow: theme.shadows[20],
                }
            }}
        >
            <DialogTitle component="div" sx={{ m: 0, p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Typography variant="h6" sx={{ fontWeight: 700 }}>
                    {event ? 'Edit Event' : 'New Encrypted Event'}
                </Typography>
                <IconButton onClick={onClose} size="small">
                    <CloseIcon />
                </IconButton>
            </DialogTitle>

            <DialogContent dividers sx={{ borderColor: alpha(theme.palette.divider, 0.1) }}>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, mt: 1 }}>
                    <TextField
                        label="Event Title"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        fullWidth
                        required
                        variant="outlined"
                        InputProps={{
                            sx: { borderRadius: '12px' }
                        }}
                    />

                    <Box sx={{ display: 'flex', gap: 2 }}>
                        <TextField
                            label="Start Date & Time"
                            type="datetime-local"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            fullWidth
                            InputLabelProps={{ shrink: true }}
                            InputProps={{
                                sx: { borderRadius: '12px', fontFamily: 'JetBrains Mono, monospace' }
                            }}
                        />
                        <TextField
                            label="End Date & Time"
                            type="datetime-local"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            fullWidth
                            InputLabelProps={{ shrink: true }}
                            InputProps={{
                                sx: { borderRadius: '12px', fontFamily: 'JetBrains Mono, monospace' }
                            }}
                        />
                    </Box>

                    <FormControlLabel
                        control={
                            <Checkbox
                                checked={isAllDay}
                                onChange={(e) => setIsAllDay(e.target.checked)}
                                color="primary"
                            />
                        }
                        label="All Day Event"
                    />

                    <TextField
                        label="Location"
                        value={location}
                        onChange={(e) => setLocation(e.target.value)}
                        fullWidth
                        variant="outlined"
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
                        InputProps={{
                            sx: { borderRadius: '12px' }
                        }}
                    />

                    <Box>
                        <Typography variant="subtitle2" sx={{ mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                            <PaletteIcon fontSize="small" /> Event Color
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 1.5 }}>
                            {AEGIS_COLORS.map((c) => (
                                <Box
                                    key={c.value}
                                    onClick={() => setColor(c.value)}
                                    sx={{
                                        width: 32,
                                        height: 32,
                                        borderRadius: '50%',
                                        bgcolor: c.value,
                                        cursor: 'pointer',
                                        border: color === c.value ? `2px solid ${theme.palette.text.primary}` : '2px solid transparent',
                                        transition: 'all 0.2s ease',
                                        '&:hover': {
                                            transform: 'scale(1.1)',
                                        }
                                    }}
                                    title={c.name}
                                />
                            ))}
                        </Box>
                    </Box>
                </Box>
            </DialogContent>

            <DialogActions sx={{ p: 3, justifyContent: 'space-between' }}>
                <Box>
                    {event?._id && onDelete && (
                        <Button
                            onClick={() => onDelete(event._id)}
                            color="error"
                            sx={{ borderRadius: '12px', textTransform: 'none' }}
                        >
                            Delete Event
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
                        disabled={isSaving || !title || !startDate || !endDate}
                        sx={{
                            borderRadius: '12px',
                            px: 4,
                            textTransform: 'none',
                            fontWeight: 600,
                        }}
                    >
                        {isSaving ? 'Securing...' : (event ? 'Update' : 'Secure Save')}
                    </Button>
                </Box>
            </DialogActions>
        </Dialog>
    );
};
