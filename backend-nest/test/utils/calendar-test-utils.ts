import { SuperAgentTest } from 'supertest';

export interface CalendarEventData {
    encryptedData: string;
    encapsulatedKey: string;
    encryptedSymmetricKey: string;
    startDate: string | Date;
    endDate: string | Date;
    isAllDay?: boolean;
    color?: string;
    recordHash: string;
    mentions?: string[];
}

export const validCalendarEventData: CalendarEventData = {
    encryptedData: 'test_encrypted_calendar_data',
    encapsulatedKey: 'test_kem_key',
    encryptedSymmetricKey: 'test_wrapped_key',
    startDate: new Date().toISOString(),
    endDate: new Date(Date.now() + 3600000).toISOString(), // 1 hour later
    isAllDay: false,
    color: '#3f51b5',
    recordHash: 'test_calendar_hash',
    mentions: []
};

const applyAuth = (req: any, accessToken?: string) => {
    if (accessToken) {
        req.set('Authorization', `Bearer ${accessToken}`);
    }
    return req;
};

export const createEvent = async (
    agent: SuperAgentTest,
    data: Partial<CalendarEventData> = {},
    accessToken?: string
) => {
    const req = agent.post('/api/calendar');
    applyAuth(req, accessToken);
    return req.send({ ...validCalendarEventData, ...data });
};

export const getEvents = async (
    agent: SuperAgentTest,
    params: { start?: string; end?: string; limit?: number; cursor?: string } = {},
    accessToken?: string
) => {
    const req = agent.get('/api/calendar').query(params);
    applyAuth(req, accessToken);
    return req;
};

export const updateEvent = async (
    agent: SuperAgentTest,
    eventId: string,
    data: any,
    accessToken?: string
) => {
    const req = agent.put(`/api/calendar/${eventId}`);
    applyAuth(req, accessToken);
    return req.send(data);
};

export const deleteEvent = async (
    agent: SuperAgentTest,
    eventId: string,
    accessToken?: string
) => {
    const req = agent.delete(`/api/calendar/${eventId}`);
    applyAuth(req, accessToken);
    return req;
};
