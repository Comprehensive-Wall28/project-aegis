import { create } from 'zustand';
import calendarService from '../services/calendarService';
import type { CalendarEventInput } from '../services/calendarService';
import type { EncryptedCalendarEvent } from '../hooks/useCalendarEncryption';

interface CalendarState {
    events: any[]; // Decrypted events
    isLoading: boolean;
    error: string | null;

    fetchEvents: (start?: string, end?: string, decryptFn?: (events: EncryptedCalendarEvent[]) => Promise<any[]>) => Promise<void>;
    addEvent: (event: CalendarEventInput, decryptFn: (event: EncryptedCalendarEvent) => Promise<any>, mentions?: string[]) => Promise<void>;
    updateEvent: (id: string, updates: Partial<CalendarEventInput>, decryptFn: (event: EncryptedCalendarEvent) => Promise<any>, mentions?: string[]) => Promise<void>;
    deleteEvent: (id: string) => Promise<void>;
}

export const useCalendarStore = create<CalendarState>((set) => ({
    events: [],
    isLoading: false,
    error: null,

    fetchEvents: async (start, end, decryptFn) => {
        set({ isLoading: true, error: null });
        try {
            const encryptedEvents = await calendarService.getEvents({ start, end });
            if (decryptFn) {
                const decryptedEvents = await decryptFn(encryptedEvents);
                set({ events: decryptedEvents, isLoading: false });
            } else {
                set({ events: encryptedEvents, isLoading: false });
            }
        } catch (error: any) {
            set({ error: error.message || 'Failed to fetch events', isLoading: false });
        }
    },

    addEvent: async (event, decryptFn, mentions) => {
        set({ isLoading: true, error: null });
        try {
            const newEncryptedEvent = await calendarService.createEvent({ ...event, mentions });
            const decryptedEvent = await decryptFn(newEncryptedEvent);
            set(state => ({
                events: [...state.events, decryptedEvent],
                isLoading: false
            }));
        } catch (error: any) {
            set({ error: error.message || 'Failed to add event', isLoading: false });
        }
    },

    updateEvent: async (id, updates, decryptFn, mentions) => {
        set({ isLoading: true, error: null });
        try {
            const updatedEncryptedEvent = await calendarService.updateEvent(id, { ...updates, mentions });
            const decryptedEvent = await decryptFn(updatedEncryptedEvent);
            set(state => ({
                events: state.events.map(e => e._id === id ? decryptedEvent : e),
                isLoading: false
            }));
        } catch (error: any) {
            set({ error: error.message || 'Failed to update event', isLoading: false });
        }
    },

    deleteEvent: async (id) => {
        set({ isLoading: true, error: null });
        try {
            await calendarService.deleteEvent(id);
            set(state => ({
                events: state.events.filter(e => e._id !== id),
                isLoading: false
            }));
        } catch (error: any) {
            set({ error: error.message || 'Failed to delete event', isLoading: false });
        }
    }
}));
