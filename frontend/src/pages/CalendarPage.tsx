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
    Stack,
    useMediaQuery,
} from '@mui/material';
import { CalendarMonth as CalendarIcon } from '@mui/icons-material';
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
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
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

    const handleSelect = (info: any) => {
        setSelectedEvent({
            start: info.startStr,
            end: info.endStr,
            allDay: info.allDay,
        });
        setDialogOpen(true);
        // info.view.calendar.unselect(); // Optional: clears selection
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

    const renderEventContent = (eventInfo: any) => {
        const { event } = eventInfo;
        const startTime = event.start
            ? new Date(event.start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
            : '';

        return (
            <Box
                sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    width: '100%',
                    overflow: 'hidden',
                    whiteSpace: 'nowrap',
                    textOverflow: 'ellipsis',
                    position: 'relative',
                    zIndex: 2,
                }}
            >
                <Stack direction="row" spacing={0.8} alignItems="center">
                    <Box
                        sx={{
                            width: 8,
                            height: 8,
                            borderRadius: '50%',
                            bgcolor: event.backgroundColor,
                            boxShadow: `0 0 10px ${event.backgroundColor}`,
                            flexShrink: 0
                        }}
                    />
                    <Typography
                        variant="caption"
                        sx={{
                            fontWeight: 700,
                            color: 'inherit',
                            fontSize: { xs: '0.65rem', sm: '0.75rem' },
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            display: 'block',
                            letterSpacing: '0.2px',
                        }}
                    >
                        {event.title}
                    </Typography>
                </Stack>
                {!event.allDay && startTime && (
                    <Typography
                        variant="caption"
                        sx={{
                            opacity: 0.7,
                            fontSize: '0.65rem',
                            ml: 2,
                            fontWeight: 500,
                            fontFamily: 'JetBrains Mono, monospace'
                        }}
                    >
                        {startTime}
                    </Typography>
                )}
            </Box>
        );
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
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, p: { xs: 0, md: 0 }, pt: { xs: 1, md: 1 } }}>
            <Box
                sx={{ display: { xs: 'none', sm: 'flex' }, alignItems: 'center', justifyContent: 'space-between' }}
            >
                <Box sx={{ px: { xs: 1, sm: 0 } }}>
                    <Typography
                        variant="h4"
                        sx={{
                            fontWeight: 700,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 1.5,
                            fontSize: { xs: '1.25rem', sm: '2rem', md: '2.125rem' }
                        }}
                    >
                        <CalendarIcon sx={{ fontSize: { xs: 24, md: 32 }, color: 'primary.main' }} /> Secure Calendar
                    </Typography>
                </Box>
            </Box>

            <Paper
                elevation={0}
                sx={{
                    p: { xs: 0.5, sm: 1.5 },
                    borderRadius: { xs: '16px', sm: '24px' },
                    bgcolor: alpha(theme.palette.background.paper, 0.6),
                    // backdropFilter removed for performance
                    border: `1px solid ${alpha(theme.palette.common.white, 0.08)}`,
                    overflow: 'hidden',
                    position: 'relative',
                    zIndex: 1,
                    minHeight: { xs: '500px', md: '650px' },
                    '& .fc': {
                        '--fc-border-color': alpha(theme.palette.divider, 0.1),
                        '--fc-today-bg-color': alpha(theme.palette.primary.main, 0.15),
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
                        gap: { xs: 1, sm: 0 },
                        mb: { xs: 1.5, sm: 3 },
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
                        borderColor: `${alpha(theme.palette.common.white, 0.08)} !important`,
                        background: 'transparent !important',
                    },
                    '& .fc-scrollgrid': {
                        border: `1px solid ${alpha(theme.palette.common.white, 0.05)} !important`,
                        background: 'transparent !important',
                        borderRadius: { xs: '8px', sm: '16px' },
                        overflow: 'hidden',
                    },
                    '& .fc-daygrid-day': {
                        cursor: 'pointer',
                        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                        '&:hover': {
                            bgcolor: `${alpha(theme.palette.primary.main, 0.04)} !important`,
                        }
                    },
                    '& .fc-view-harness': {
                        background: 'transparent !important',
                        height: { xs: '450px !important', sm: 'auto !important' }
                    },
                    '& .fc-col-header-cell': {
                        bgcolor: `${alpha(theme.palette.background.paper, 0.4)} !important`,
                        borderBottom: `1px solid ${alpha(theme.palette.common.white, 0.08)} !important`,
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
                        bgcolor: `${alpha(theme.palette.primary.main, 0.08)} !important`,
                        position: 'relative',
                        boxShadow: `inset 0 0 0 2px ${theme.palette.primary.main} !important`,
                        zIndex: 2,
                        '&::after': {
                            display: 'none',
                        },
                        '& .fc-daygrid-day-number': {
                            color: `${theme.palette.primary.main} !important`,
                            fontWeight: 800,
                            position: 'relative',
                            zIndex: 2,
                        }
                    },
                    '& .fc-daygrid-day.fc-day-other': {
                        opacity: 0.4,
                        '&:hover': {
                            opacity: 0.8
                        }
                    },
                    '& .fc-daygrid-event': {
                        borderRadius: '6px',
                        px: { xs: 0.5, sm: 1 },
                        py: { xs: 0.2, sm: 0.4 },
                        fontSize: { xs: '0.65rem', sm: '0.8rem' },
                        fontWeight: 600,
                        border: 'none !important',
                        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                        mx: '2px !important',
                        mb: '2px !important',
                        position: 'relative',
                        overflow: 'hidden',
                        bgcolor: 'transparent !important', // We use after for background
                        '&::before': {
                            content: '""',
                            position: 'absolute',
                            inset: 0,
                            bgcolor: 'currentColor',
                            opacity: 0.12,
                            zIndex: 1,
                        },
                        '&::after': {
                            content: '""',
                            position: 'absolute',
                            inset: 0,
                            background: 'linear-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.02) 100%)',
                            backdropFilter: 'blur(4px)',
                            zIndex: 0,
                        },
                        '&:hover': {
                            transform: 'translateY(-2px)',
                            boxShadow: '0 8px 16px rgba(0,0,0,0.3)',
                            '&::before': {
                                opacity: 0.2,
                            }
                        }
                    },
                    '& .fc-event-main': {
                        padding: 0,
                        color: theme.palette.text.primary,
                    },
                    '& .fc-daygrid-event-dot': {
                        display: 'none', // Hide default dots
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
                        borderRadius: '12px !important',
                        fontWeight: 700,
                        textTransform: 'capitalize',
                        px: { xs: 1, sm: 2.5 },
                        py: { xs: 0.5, sm: 1.2 },
                        fontSize: { xs: '0.7rem', sm: '0.875rem' },
                        bgcolor: `${alpha(theme.palette.background.paper, 0.3)} !important`,
                        backdropFilter: 'blur(12px)',
                        border: `1px solid ${alpha(theme.palette.common.white, 0.08)} !important`,
                        color: `${theme.palette.text.primary} !important`,
                        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                        boxShadow: 'none',
                        '&:hover': {
                            bgcolor: `${alpha(theme.palette.primary.main, 0.1)} !important`,
                            borderColor: `${alpha(theme.palette.primary.main, 0.3)} !important`,
                            transform: 'translateY(-1px)',
                        },
                        '&:active, &:focus, &.fc-button-active': {
                            bgcolor: `${alpha(theme.palette.primary.main, 0.15)} !important`,
                            borderColor: `${theme.palette.primary.main} !important`,
                            color: `${theme.palette.primary.main} !important`,
                            boxShadow: `0 0 20px ${alpha(theme.palette.primary.main, 0.25)} !important`,
                            zIndex: 5,
                        },
                        '&:disabled': {
                            opacity: 0.5,
                            cursor: 'not-allowed',
                            '&:hover': {
                                transform: 'none',
                                bgcolor: `${alpha(theme.palette.background.paper, 0.3)} !important`,
                            }
                        }
                    },
                    '& .fc-button-group': {
                        gap: '4px',
                        '& .fc-button': {
                            margin: '0 !important',
                        },
                        '& > .fc-button:not(:last-of-type)': {
                            borderTopRightRadius: '12px !important',
                            borderBottomRightRadius: '12px !important',
                        },
                        '& > .fc-button:not(:first-of-type)': {
                            borderTopLeftRadius: '12px !important',
                            borderBottomLeftRadius: '12px !important',
                        }
                    },
                    '& .fc-today-button': {
                        ml: { xs: 0, sm: 2 },
                        border: `1px solid ${alpha(theme.palette.secondary.main, 0.3)} !important`,
                        '&:hover': {
                            borderColor: `${theme.palette.secondary.main} !important`,
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
                        left: isMobile ? 'prev,next' : 'prev,next today',
                        center: 'title',
                        right: isMobile ? 'dayGridMonth,timeGridDay' : 'dayGridMonth,timeGridWeek,timeGridDay'
                    }}
                    editable={true}
                    selectable={true}
                    selectMirror={true}
                    dayMaxEvents={true}
                    events={calendarEvents}
                    dateClick={handleDateClick}
                    select={handleSelect}
                    eventClick={handleEventClick}
                    eventDrop={handleEventDrop}
                    eventResize={handleEventDrop}
                    eventDisplay="block"
                    eventContent={renderEventContent}
                    height="auto"
                    dayHeaderFormat={{ weekday: isMobile ? 'narrow' : 'short' }}
                    weekends={!isMobile} // Hide weekends on mobile to reduce columns from 7 to 5
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
