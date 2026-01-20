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
    useMediaQuery,
    Popover,
    IconButton,
} from '@mui/material';
import { CalendarMonth as CalendarIcon, Close as CloseIcon } from '@mui/icons-material';
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
    const [popoverState, setPopoverState] = useState<{ anchorEl: HTMLElement | null; date: Date | null }>({ anchorEl: null, date: null });
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
            setPopoverState({ anchorEl: null, date: null }); // Close popover if open
        }
    };

    const handleMoreLinkClick = (args: any) => {
        args.jsEvent.preventDefault();
        setPopoverState({ anchorEl: args.jsEvent.target, date: args.date });
    };

    const handlePopoverClose = () => {
        setPopoverState({ anchorEl: null, date: null });
    };

    const getEventsForDate = (date: Date | null) => {
        if (!date) return [];
        return events.filter(e => {
            const eventStart = new Date(e.startDate);
            const eventEnd = new Date(e.endDate);
            const target = new Date(date);
            target.setHours(0, 0, 0, 0);

            // Simple overlap check for day view
            const startDay = new Date(eventStart);
            startDay.setHours(0, 0, 0, 0);
            const endDay = new Date(eventEnd);
            endDay.setHours(0, 0, 0, 0);

            return target >= startDay && target <= endDay;
        });
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
        const backgroundColor = event.backgroundColor || event.extendedProps?.color || '#3f51b5';

        return (
            <Box
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    width: '100%',
                    overflow: 'hidden',
                    bgcolor: alpha(backgroundColor, 0.2),
                    borderLeft: `4px solid ${backgroundColor}`,
                    borderRadius: '4px',
                    px: 0.8,
                    py: 0.4,
                    minHeight: '24px',
                }}
            >
                <Typography
                    variant="caption"
                    noWrap
                    sx={{
                        fontWeight: 600,
                        color: 'text.primary',
                        fontSize: '0.75rem',
                        lineHeight: 1.2
                    }}
                >
                    {event.title}
                </Typography>
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
            backgroundColor: e.color || '#3f51b5',
            borderColor: e.color || '#3f51b5',
            color: e.color || '#3f51b5', // also pass it in properties
        }));
    }, [events]);

    const popoverEvents = useMemo(() => getEventsForDate(popoverState.date), [popoverState.date, events]);

    if (pqcEngineStatus !== 'operational' && isLoading) {
        return (
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', minHeight: 400 }}>
                <CircularProgress />
            </Box>
        );
    }

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', p: 0 }}>
            <Box
                sx={{
                    display: { xs: 'none', sm: 'flex' },
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    p: { xs: 2, sm: 3 },
                    px: { xs: 2.5, sm: 4 }, // Increased horizontal padding
                    pb: 1
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
                    p: 0,
                    borderRadius: 0,
                    bgcolor: 'transparent',
                    border: 'none',
                    overflow: 'hidden',
                    position: 'relative',
                    zIndex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    flex: 1,
                    minHeight: 0,
                    '& .fc': {
                        '--fc-border-color': alpha(theme.palette.divider, 0.05),
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
                        px: { xs: 2.5, sm: 4 }, // Add horizontal padding to toolbar
                    },
                    '& .fc-day': {
                        cursor: 'pointer',
                        transition: 'background-color 0.2s ease',
                        '&:hover': {
                            bgcolor: alpha(theme.palette.primary.main, 0.04),
                        }
                    },
                    '& .fc-theme-standard td, & .fc-theme-standard th': {
                        borderColor: `${alpha(theme.palette.common.white, 0.05)} !important`,
                        background: 'transparent !important',
                    },
                    '& .fc-scrollgrid': {
                        border: `1px solid ${alpha(theme.palette.common.white, 0.04)} !important`,
                        background: 'transparent !important',
                        borderRadius: 0,
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
                        flex: 1,
                    },
                    '& .fc-col-header-cell': {
                        bgcolor: `${theme.palette.background.paper} !important`,
                        borderBottom: `1px solid ${alpha(theme.palette.common.white, 0.06)} !important`,
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
                        borderRadius: '4px',
                        margin: '1px 2px !important',
                        border: 'none !important',
                        bgcolor: 'transparent !important',
                        padding: '0 !important',
                        boxShadow: 'none !important',
                        '&:hover': {
                            backgroundColor: 'transparent !important',
                        },
                        '&::before, &::after': {
                            display: 'none',
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
                        bgcolor: `${theme.palette.background.paper} !important`,
                        border: `1px solid ${alpha(theme.palette.common.white, 0.07)} !important`,
                        color: `${theme.palette.text.primary} !important`,
                        boxShadow: 'none !important',
                        outline: 'none !important',
                        '&:hover': {
                            bgcolor: 'transparent !important',
                            borderColor: `${theme.palette.primary.main} !important`,
                            color: `${theme.palette.primary.main} !important`,
                            boxShadow: 'none !important',
                        },
                        '&:active, &:focus, &:focus-visible, &.fc-button-active': {
                            bgcolor: `${theme.palette.primary.main} !important`,
                            borderColor: `${theme.palette.primary.main} !important`,
                            color: `${theme.palette.primary.contrastText} !important`,
                            zIndex: 5,
                            boxShadow: 'none !important',
                            outline: 'none !important',
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
                        border: `1px solid ${alpha(theme.palette.secondary.main, 0.12)} !important`,
                        '&:hover': {
                            borderColor: `${theme.palette.secondary.main} !important`,
                        }
                    },
                    '& .fc-prev-button, & .fc-next-button': {
                        boxShadow: 'none !important',
                        outline: 'none !important',
                        '&:active, &:focus, &:focus-visible': {
                            boxShadow: 'none !important',
                            outline: 'none !important',
                            bgcolor: 'transparent !important',
                            color: `${theme.palette.primary.main} !important`,
                        },
                        '&:hover': {
                            bgcolor: 'transparent !important',
                            color: `${theme.palette.primary.main} !important`,
                        },
                        '&:disabled': {
                            boxShadow: 'none !important',
                            outline: 'none !important',
                            opacity: 0.3,
                        }
                    },
                    '& .fc-scroller': {
                        msOverflowStyle: 'none',
                        scrollbarWidth: 'none',
                        '&::-webkit-scrollbar': {
                            display: 'none'
                        }
                    },
                    '& .fc-more-link': {
                        color: `${alpha(theme.palette.text.secondary, 0.8)} !important`,
                        fontWeight: 600,
                        fontSize: '0.75rem',
                        marginTop: '4px',
                        display: 'block',
                        paddingLeft: '4px',
                        '&:hover': {
                            textDecoration: 'none',
                            color: `${theme.palette.text.primary} !important`,
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
                    dayMaxEvents={2}
                    events={calendarEvents}
                    dateClick={handleDateClick}
                    select={handleSelect}
                    eventClick={handleEventClick}
                    eventDrop={handleEventDrop}
                    eventResize={handleEventDrop}
                    eventDisplay="block"
                    eventContent={renderEventContent}
                    height="100%"
                    dayHeaderFormat={{ weekday: isMobile ? 'narrow' : 'short' }}
                    weekends={!isMobile} // Hide weekends on mobile to reduce columns from 7 to 5
                    moreLinkClick={handleMoreLinkClick}
                />
            </Paper>

            <Popover
                open={Boolean(popoverState.anchorEl)}
                anchorEl={popoverState.anchorEl}
                onClose={handlePopoverClose}
                anchorOrigin={{
                    vertical: 'center',
                    horizontal: 'center',
                }}
                transformOrigin={{
                    vertical: 'center',
                    horizontal: 'center',
                }}
                PaperProps={{
                    sx: {
                        borderRadius: '16px',
                        bgcolor: theme.palette.background.paper,
                        backgroundImage: 'none',
                        boxShadow: theme.shadows[8],
                        border: `1px solid ${theme.palette.divider}`,
                        minWidth: 280,
                        maxWidth: 320,
                        overflow: 'hidden',
                    }
                }}
            >
                <Box sx={{ p: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                        <Typography variant="h3" sx={{ fontWeight: 400, color: 'text.primary', fontSize: '3rem', lineHeight: 1 }}>
                            {popoverState.date?.getDate()}
                        </Typography>
                        <IconButton
                            size="small"
                            onClick={handlePopoverClose}
                            sx={{
                                color: 'text.secondary',
                                '&:hover': { color: 'text.primary', bgcolor: alpha(theme.palette.text.primary, 0.05) }
                            }}
                        >
                            <CloseIcon fontSize="small" />
                        </IconButton>
                    </Box>

                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, mb: 2 }}>
                        {popoverEvents.map((event) => (
                            <Box
                                key={event._id}
                                onClick={() => handleEventClick({ event: { id: event._id } })}
                                sx={{
                                    cursor: 'pointer',
                                    transition: 'transform 0.2s',
                                    '&:hover': { transform: 'translateX(2px)' }
                                }}
                            >
                                {renderEventContent({ event: { ...event, backgroundColor: event.color } })}
                            </Box>
                        ))}
                    </Box>

                    <Typography
                        onClick={() => {
                            if (popoverState.date) {
                                handleDateClick({ dateStr: popoverState.date.toISOString() });
                                handlePopoverClose();
                            }
                        }}
                        sx={{
                            textAlign: 'center',
                            color: 'text.primary',
                            fontWeight: 700,
                            fontSize: '0.9rem',
                            cursor: 'pointer',
                            py: 1,
                            borderRadius: '8px',
                            transition: 'background-color 0.2s',
                            '&:hover': {
                                bgcolor: alpha(theme.palette.text.primary, 0.05)
                            }
                        }}
                    >
                        New Event...
                    </Typography>
                </Box>
            </Popover>

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
