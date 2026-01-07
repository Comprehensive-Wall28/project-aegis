import apiClient from './api';
import type { EncryptedCalendarEvent, EncryptedCalendarPayload } from '../hooks/useCalendarEncryption';

const PREFIX = '/calendar';

// Input for creating/updating events (includes plaintext scheduling fields)
export interface CalendarEventInput extends EncryptedCalendarPayload {
    startDate: string;
    endDate: string;
    isAllDay: boolean;
    color: string;
    recordHash: string;
}

const calendarService = {
    getEvents: async (start?: string, end?: string): Promise<EncryptedCalendarEvent[]> => {
        const params = new URLSearchParams();
        if (start) params.append('start', start);
        if (end) params.append('end', end);

        const response = await apiClient.get<EncryptedCalendarEvent[]>(`${PREFIX}`, { params });
        return response.data;
    },

    createEvent: async (data: CalendarEventInput): Promise<EncryptedCalendarEvent> => {
        const response = await apiClient.post<EncryptedCalendarEvent>(`${PREFIX}`, data);
        return response.data;
    },

    updateEvent: async (id: string, data: Partial<CalendarEventInput>): Promise<EncryptedCalendarEvent> => {
        const response = await apiClient.put<EncryptedCalendarEvent>(`${PREFIX}/${id}`, data);
        return response.data;
    },

    deleteEvent: async (id: string): Promise<void> => {
        await apiClient.delete(`${PREFIX}/${id}`);
    }
};

export default calendarService;
