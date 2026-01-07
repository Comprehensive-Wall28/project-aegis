import { useState, useEffect, useMemo, useRef } from 'react';
import {
    Box,
    Typography,
    Paper,
    alpha,
    useTheme,
    CircularProgress,
    Snackbar,
    Alert,
} from '@mui/material';
import { CalendarMonth as CalendarIcon } from '@mui/icons-material';
import { motion } from 'framer-motion';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { useCalendarStore } from '@/stores/useCalendarStore';
import { useCalendarEncryption } from '@/hooks/useCalendarEncryption';
import { EventDialog } from '@/components/calendar/EventDialog';
import { useSessionStore } from '@/stores/sessionStore';

export function CalendarPage() {
    const theme = useTheme();
    const pqcEngineStatus = useSessionStore((state) => state.pqcEngineStatus);
    const events = useCalendarStore((state) => state.events);
    const isLoading = useCalendarStore((state) => state.isLoading);
    const fetchEvents = useCalendarStore((state) => state.fetchEvents);
    const addEvent = useCalendarStore((state) => state.addEvent);
    const updateEvent = useCalendarStore((state) => state.updateEvent);
    const deleteEvent = useCalendarStore((state) => state.deleteEvent);

    const { encryptEventData, decryptEvents, decryptEventData, generateRecordHash } = useCalendarEncryption();

    const [dialogOpen, setDialogOpen] = useState(false);
    const [selectedEvent, setSelectedEvent] = useState<any>(null);
    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });
    const calendarRef = useRef<any>(null);

    const showSnackbar = (message: string, severity: 'success' | 'error' = 'success') => {
        setSnackbar({ open: true, message, severity });
    };

    useEffect(() => {
        let isMounted = true;
        if (pqcEngineStatus === 'operational' && isMounted) {
            fetchEvents(undefined, undefined, decryptEvents);
        }
        return () => { isMounted = false; };
    }, [pqcEngineStatus, fetchEvents, decryptEvents]);

    const handleDateClick = (arg: any) => {
        setSelectedEvent({ start: arg.dateStr, end: arg.dateStr });
        setDialogOpen(true);
    };

    const handleEventClick = (info: any) => {
        const event = events.find(e => e._id === info.event.id);
        if (event) {
            setSelectedEvent({
                ...event,
                id: event._id,
                start: event.startDate,
                end: event.endDate,
                allDay: event.isAllDay,
            });
            setDialogOpen(true);
        }
    };

    const handleEventDrop = async (info: any) => {
        const { event } = info;
        try {
            const existingEvent = events.find(e => e._id === event.id);
            if (!existingEvent) return;

            const recordHash = await generateRecordHash(
                { title: existingEvent.title, description: existingEvent.description, location: existingEvent.location },
                event.start.toISOString(),
                event.end?.toISOString() || event.start.toISOString()
            );

            await updateEvent(event.id, {
                startDate: event.start.toISOString(),
                endDate: event.end?.toISOString() || event.start.toISOString(),
                isAllDay: event.allDay,
                recordHash
            }, decryptEventData);

            showSnackbar('Event moved securely', 'success');
        } catch (err: any) {
            showSnackbar(err.message || 'Failed to move event', 'error');
            info.revert();
        }
    };

    const handleDialogSubmit = async (data: any) => {
        try {
            const recordHash = await generateRecordHash(
                { title: data.title, description: data.description, location: data.location },
                data.startDate,
                data.endDate
            );

            const encryptedPayload = await encryptEventData({
                title: data.title,
                description: data.description,
                location: data.location,
            });

            const eventInput = {
                ...encryptedPayload,
                startDate: data.startDate,
                endDate: data.endDate,
                isAllDay: data.isAllDay,
                color: data.color,
                recordHash
            };

            if (selectedEvent?._id) {
                await updateEvent(selectedEvent._id, eventInput, decryptEventData);
                showSnackbar('Event updated securely', 'success');
            } else {
                await addEvent(eventInput, decryptEventData);
                showSnackbar('Event created with PQC encryption', 'success');
            }
            setDialogOpen(false);
        } catch (err: any) {
            showSnackbar(err.message || 'Operation failed', 'error');
        }
    };

    const handleDeleteEvent = async (id: string) => {
        try {
            await deleteEvent(id);
            showSnackbar('Event deleted successfully', 'success');
            setDialogOpen(false);
        } catch (err: any) {
            showSnackbar(err.message || 'Failed to delete event', 'error');
        }
    };

    const calendarEvents = useMemo(() => {
        return events.map(e => ({
            id: e._id,
            title: e.title,
            start: e.startDate,
            end: e.endDate,
            allDay: e.isAllDay,
            backgroundColor: e.color,
            borderColor: e.color,
        }));
    }, [events]);

    if (pqcEngineStatus !== 'operational' && isLoading) {
        return (
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', minHeight: 400 }}>
                <CircularProgress />
            </Box>
        );
    }

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, p: { xs: 1, md: 3 } }}>
            <Box
                component={motion.div}
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
            >
                <Box>
                    <Typography
                        variant="h4"
                        sx={{
                            fontWeight: 700,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 1.5,
                            fontSize: { xs: '1.5rem', sm: '2rem', md: '2.125rem' }
                        }}
                    >
                        <CalendarIcon sx={{ fontSize: { xs: 28, md: 32 }, color: 'primary.main' }} /> Secure Calendar
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
                        PQC-encrypted scheduling for Project Aegis
                    </Typography>
                </Box>
            </Box>

            <Paper
                elevation={0}
                sx={{
                    p: { xs: 1, sm: 2 },
                    borderRadius: '24px',
                    bgcolor: alpha(theme.palette.background.paper, 0.6),
                    // backdropFilter removed for performance
                    border: `1px solid ${alpha(theme.palette.common.white, 0.05)}`,
                    overflow: 'hidden',
                    position: 'relative',
                    zIndex: 1,
                    minHeight: { xs: '500px', md: '650px' },
                    '& .fc': {
                        '--fc-border-color': alpha(theme.palette.divider, 0.1),
                        '--fc-today-bg-color': alpha(theme.palette.primary.main, 0.15),
                        '--fc-button-bg-color': alpha(theme.palette.primary.main, 0.8),
                        '--fc-button-border-color': 'transparent',
                        '--fc-button-hover-bg-color': theme.palette.primary.main,
                        '--fc-button-active-bg-color': theme.palette.primary.dark,
                        '--fc-event-border-color': 'transparent',
                        '--fc-list-event-hover-bg-color': alpha(theme.palette.primary.main, 0.1),
                        '--fc-page-bg-color': 'transparent',
                        '--fc-neutral-bg-color': 'transparent',
                        fontFamily: 'inherit',
                        color: theme.palette.text.primary,
                        fontSize: { xs: '0.75rem', sm: '0.85rem' },
                    },
                    '& .fc-toolbar': {
                        flexDirection: { xs: 'column', sm: 'row' },
                        gap: { xs: 2, sm: 0 },
                        mb: { xs: 2, sm: 3 },
                        px: { xs: 1, sm: 0 },
                    },
                    '& .fc-day': {
                        cursor: 'pointer',
                        transition: 'background-color 0.2s ease',
                        '&:hover': {
                            bgcolor: alpha(theme.palette.primary.main, 0.04),
                        }
                    },
                    '& .fc-theme-standard td, & .fc-theme-standard th': {
                        borderColor: alpha(theme.palette.divider, 0.1),
                        background: 'transparent !important',
                    },
                    '& .fc-scrollgrid': {
                        border: 'none !important',
                        background: 'transparent !important',
                    },
                    '& .fc-view-harness': {
                        background: 'transparent !important',
                        height: { xs: '400px !important', sm: 'auto !important' }
                    },
                    '& .fc-scrollgrid-sync-table': {
                        background: 'transparent !important',
                    },
                    '& .fc-col-header-cell': {
                        bgcolor: alpha(theme.palette.background.paper, 0.5),
                    },
                    '& .fc-col-header-cell-cushion': {
                        py: { xs: 1, sm: 1.5 },
                        fontSize: { xs: '0.7rem', sm: '0.85rem' },
                        fontWeight: 700,
                        color: theme.palette.primary.main,
                        textTransform: 'uppercase',
                        letterSpacing: '1px',
                    },
                    '& .fc-daygrid-day-number': {
                        p: { xs: 0.5, sm: 1 },
                        fontSize: { xs: '0.75rem', sm: '0.9rem' },
                        fontWeight: 600,
                        color: alpha(theme.palette.text.primary, 0.8),
                        fontFamily: 'JetBrains Mono, monospace',
                    },
                    '& .fc-daygrid-day.fc-day-today': {
                        bgcolor: `${alpha(theme.palette.primary.main, 0.15)} !important`,
                        position: 'relative',
                        '&::after': {
                            content: '""',
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            right: 0,
                            height: '4px',
                            background: `linear-gradient(90deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                            borderRadius: '24px 24px 0 0',
                        },
                        '& .fc-daygrid-day-number': {
                            color: `${theme.palette.primary.main} !important`,
                            fontWeight: 800,
                        }
                    },
                    '& .fc-daygrid-event': {
                        borderRadius: '6px',
                        px: { xs: 0.5, sm: 1.2 },
                        py: { xs: 0.2, sm: 0.6 },
                        fontSize: { xs: '0.65rem', sm: '0.8rem' },
                        fontWeight: 600,
                        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                        border: 'none !important',
                        transition: 'transform 0.2s ease',
                        '&:hover': {
                            transform: 'translateY(-2px) scale(1.02)',
                        }
                    },
                    '& .fc-toolbar-title': {
                        fontSize: { xs: '1.1rem !important', sm: '1.3rem !important', md: '1.5rem !important' },
                        fontWeight: 800,
                        textAlign: 'center',
                        color: theme.palette.primary.main,
                    },
                    '& .fc-timegrid-slot-label-cushion': {
                        fontFamily: 'JetBrains Mono, monospace',
                        fontSize: '0.65rem',
                        color: theme.palette.text.secondary,
                    },
                    '& .fc-button': {
                        borderRadius: '10px',
                        fontWeight: 600,
                        textTransform: 'capitalize',
                        px: { xs: 1, sm: 2 },
                        py: { xs: 0.5, sm: 1 },
                        fontSize: { xs: '0.7rem', sm: '0.875rem' },
                        '&:focus': {
                            boxShadow: 'none !important',
                        }
                    },
                    '& .fc-scroller': {
                        msOverflowStyle: 'none',
                        scrollbarWidth: 'none',
                        '&::-webkit-scrollbar': {
                            display: 'none'
                        }
                    }
                }}
            >
                <FullCalendar
                    ref={calendarRef}
                    plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
                    initialView="dayGridMonth"
                    headerToolbar={{
                        left: 'prev,next today',
                        center: 'title',
                        right: 'dayGridMonth,timeGridWeek,timeGridDay'
                    }}
                    editable={true}
                    selectable={true}
                    selectMirror={true}
                    dayMaxEvents={true}
                    events={calendarEvents}
                    dateClick={handleDateClick}
                    eventClick={handleEventClick}
                    eventDrop={handleEventDrop}
                    eventResize={handleEventDrop}
                    height="auto"
                />
            </Paper>

            <EventDialog
                open={dialogOpen}
                onClose={() => setDialogOpen(false)}
                onSubmit={handleDialogSubmit}
                onDelete={handleDeleteEvent}
                event={selectedEvent}
                isSaving={isLoading}
            />

            <Snackbar
                open={snackbar.open}
                autoHideDuration={6000}
                onClose={() => setSnackbar({ ...snackbar, open: false })}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            >
                <Alert onClose={() => setSnackbar({ ...snackbar, open: false })} severity={snackbar.severity} sx={{ width: '100%', borderRadius: '12px' }}>
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </Box>
    );
}
