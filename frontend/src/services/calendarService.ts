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
    mentions?: string[];
}

export interface PaginatedEvents {
    items: EncryptedCalendarEvent[];
    nextCursor: string | null;
}

const calendarService = {
    getEvents: async (filters?: { start?: string; end?: string }): Promise<EncryptedCalendarEvent[]> => {
        const params = new URLSearchParams();
        if (filters?.start) params.append('start', filters.start);
        if (filters?.end) params.append('end', filters.end);

        const response = await apiClient.get<EncryptedCalendarEvent[]>(`${PREFIX}`, { params });
        return response.data;
    },

    getEventsPaginated: async (filters: { limit: number; cursor?: string }): Promise<PaginatedEvents> => {
        const params = new URLSearchParams();
        params.append('limit', filters.limit.toString());
        if (filters.cursor) params.append('cursor', filters.cursor);

        const response = await apiClient.get<PaginatedEvents>(`${PREFIX}`, { params });
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
