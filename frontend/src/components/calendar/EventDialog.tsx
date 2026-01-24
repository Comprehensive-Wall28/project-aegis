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
    useMediaQuery,
} from '@mui/material';
import { Close as CloseIcon, Palette as PaletteIcon } from '@mui/icons-material';
import { MobileDateTimePicker } from '@mui/x-date-pickers/MobileDateTimePicker';
import dayjs from 'dayjs';
import { MentionPicker, type MentionEntity } from '../tasks/MentionPicker';

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
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
    const [isPickerOpen, setIsPickerOpen] = useState(false);
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [location, setLocation] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [isAllDay, setIsAllDay] = useState(false);
    const [color, setColor] = useState(AEGIS_COLORS[0].value);

    // Mention Picker State
    const [mentionPicker, setMentionPicker] = useState<{
        open: boolean;
        field: 'description';
        anchorEl: HTMLElement | null;
        cursorPos: number;
    }>({ open: false, field: 'description', anchorEl: null, cursorPos: 0 });

    const formatDateForInput = (dateInput: string | Date | undefined) => {
        if (!dateInput) return '';
        const d = dayjs(dateInput);
        return d.isValid() ? d.toISOString() : '';
    };

    useEffect(() => {
        if (event) {
            setTitle(event.title || '');
            setDescription(event.description || '');
            setLocation(event.location || '');
            setStartDate(formatDateForInput(event.start));
            setEndDate(formatDateForInput(event.end));
            setIsAllDay(event.allDay || false);
            setColor(event.color || AEGIS_COLORS[0].value);
        } else {
            // Reset for new event
            setTitle('');
            setDescription('');
            setLocation('');
            setStartDate(formatDateForInput(new Date()));
            setEndDate(formatDateForInput(new Date(Date.now() + 3600000)));
            setIsAllDay(false);
            setColor(AEGIS_COLORS[0].value);
        }
    }, [event, open]);

    const handleMentionSelect = (entity: MentionEntity) => {
        const field = mentionPicker.field;
        const val = field === 'description' ? description : '';
        const triggerPos = mentionPicker.cursorPos - 1; // Position of '@'

        // Find the current cursor position to know how much search text to replace
        const input = mentionPicker.anchorEl as HTMLTextAreaElement;
        const currentPos = input.selectionStart;

        let mention = '';
        if (entity.type === 'file') {
            const folderId = entity.folderId || 'root';
            mention = `[@${entity.name}](aegis-file://${folderId}/${entity.id})`;
        } else if (entity.type === 'task') {
            mention = `[#${entity.name}](aegis-task://${entity.id})`;
        } else if (entity.type === 'event') {
            mention = `[~${entity.name}](aegis-event://${entity.id})`;
        }

        // Replace from the '@' up to the current cursor position
        const newValue = val.substring(0, triggerPos) + mention + val.substring(currentPos);

        if (field === 'description') setDescription(newValue);

        setMentionPicker(prev => ({ ...prev, open: false }));
    };

    const handleTextChange = (field: 'description') => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const value = e.target.value;
        if (field === 'description') setDescription(value);

        const input = e.target as HTMLTextAreaElement;
        const cursorPos = input.selectionStart;
        const textBefore = value.substring(0, cursorPos);

        // Look for the last '@' that is either at the start or preceded by a space/newline
        const lastAtIndex = textBefore.lastIndexOf('@');
        if (lastAtIndex !== -1 && (lastAtIndex === 0 || /[\s\n]/.test(textBefore[lastAtIndex - 1]))) {
            const textSinceAt = textBefore.substring(lastAtIndex + 1);
            // Keep open if playing with the same mention (no spaces/newlines since @)
            if (!/[\s\n]/.test(textSinceAt)) {
                setMentionPicker({
                    open: true,
                    field: field,
                    anchorEl: input,
                    cursorPos: lastAtIndex + 1
                });
            } else if (mentionPicker.open) {
                setMentionPicker(prev => ({ ...prev, open: false }));
            }
        } else if (mentionPicker.open) {
            setMentionPicker(prev => ({ ...prev, open: false }));
        }
    };

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
            fullScreen={isMobile}
            disableEnforceFocus={isPickerOpen}
            slotProps={{
                paper: {
                    variant: 'solid',
                    sx: {
                        borderRadius: isMobile ? 0 : '24px',
                        boxShadow: theme.shadows[20],
                        backgroundImage: 'none',
                        bgcolor: theme.palette.background.paper,
                    }
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

            <DialogContent dividers sx={{ borderColor: alpha(theme.palette.divider, 0.06) }}>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, mt: 1 }}>
                    <TextField
                        label="Event Title"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        fullWidth
                        required
                        variant="outlined"
                        slotProps={{
                            input: { sx: { borderRadius: '12px' } }
                        }}
                    />

                    <Box sx={{ display: 'flex', gap: 2, flexDirection: isMobile ? 'column' : 'row' }}>
                        <MobileDateTimePicker
                            label="Start Date & Time"
                            value={startDate ? dayjs(startDate) : null}
                            onOpen={() => setIsPickerOpen(true)}
                            onChange={(newValue) => setStartDate(newValue ? (newValue as dayjs.Dayjs).toISOString() : '')}
                            slotProps={{
                                textField: {
                                    fullWidth: true,
                                    variant: 'outlined',
                                    sx: {
                                        '& .MuiOutlinedInput-root': { borderRadius: '12px' },
                                        '& .MuiInputLabel-root': { fontFamily: 'inherit' }
                                    }
                                },
                                dialog: {
                                    TransitionProps: {
                                        onExited: () => setIsPickerOpen(false)
                                    } as any,
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
                        <MobileDateTimePicker
                            label="End Date & Time"
                            value={endDate ? dayjs(endDate) : null}
                            onOpen={() => setIsPickerOpen(true)}
                            onChange={(newValue) => setEndDate(newValue ? (newValue as dayjs.Dayjs).toISOString() : '')}
                            slotProps={{
                                textField: {
                                    fullWidth: true,
                                    variant: 'outlined',
                                    sx: {
                                        '& .MuiOutlinedInput-root': { borderRadius: '12px' },
                                        '& .MuiInputLabel-root': { fontFamily: 'inherit' }
                                    }
                                },
                                dialog: {
                                    TransitionProps: {
                                        onExited: () => setIsPickerOpen(false)
                                    } as any,
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
                        slotProps={{
                            input: { sx: { borderRadius: '12px' } }
                        }}
                    />

                    <TextField
                        label="Description"
                        value={description}
                        onChange={handleTextChange('description')}
                        fullWidth
                        multiline
                        rows={3}
                        variant="outlined"
                        placeholder="Add more details... (Use @ for mentions)"
                        slotProps={{
                            input: { sx: { borderRadius: '12px' } }
                        }}
                    />

                    {mentionPicker.open && (
                        <MentionPicker
                            anchorEl={mentionPicker.anchorEl}
                            onSelect={handleMentionSelect}
                            onClose={() => setMentionPicker(prev => ({ ...prev, open: false }))}
                        />
                    )}

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
