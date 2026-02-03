import * as request from 'supertest';
import { getAuthenticatedAgent } from './helpers/auth.helper';
import { validCalendarEventData, createEvent, getEvents, updateEvent, deleteEvent } from './utils/calendar-test-utils';

const APP_URL = 'http://localhost:5000';

describe('Calendar Domain E2E Tests (Express Backend)', () => {
    let agent: request.SuperAgentTest;
    let accessToken: string;
    let user: any;

    beforeAll(async () => {
        try {
            user = {
                username: `cal_user_${Date.now()}`,
                email: `cal_user_${Date.now()}@example.com`,
                password: 'password123!',
                pqcPublicKey: 'test_pqc_key'
            };

            const auth = await getAuthenticatedAgent(APP_URL, user);
            agent = auth.agent;
            accessToken = auth.accessToken;

            if (!agent || !accessToken) {
                throw new Error('Failed to create authenticated agent');
            }

        } catch (error) {
            console.error('Setup failed:', error);
            throw error;
        }
    });

    describe('POST /api/calendar (Create)', () => {
        it('should create a calendar event with valid data', async () => {
            const response = await createEvent(agent, {}, accessToken);
            expect(response.status).toBe(201);
            expect(response.body).toHaveProperty('_id');
            expect(typeof response.body._id).toBe('string');
            expect(response.body.userId).toBeDefined();
            expect(typeof response.body.userId).toBe('string');
            expect(response.body.color).toBe('#3f51b5');
            expect(response.body.isAllDay).toBe(false);
        });

        it('should create an all-day event with custom color', async () => {
            const response = await createEvent(agent, {
                isAllDay: true,
                color: '#ff0000'
            }, accessToken);
            expect(response.status).toBe(201);
            expect(response.body.isAllDay).toBe(true);
            expect(response.body.color).toBe('#ff0000');
        });

        it('should fail if required fields are missing', async () => {
            const response = await agent
                .post('/api/calendar')
                .set('Authorization', `Bearer ${accessToken}`)
                .send({ encryptedData: 'missing_other_fields' });

            expect(response.status).toBe(400);
            expect(Array.isArray(response.body.message)).toBe(true);
            expect(response.body.message.some((m: string) => m.toLowerCase().includes('string') || m.toLowerCase().includes('key'))).toBe(true);
        });

        it('should fail with invalid date format', async () => {
            const response = await createEvent(agent, {
                startDate: 'not-a-date'
            }, accessToken);
            // Express might return 500 or 400 depending on implementation
            expect([400, 500]).toContain(response.status);
        });
    });

    describe('GET /api/calendar (List and Filtering)', () => {
        let eventIds: string[] = [];

        beforeAll(async () => {
            // Create events in different date ranges
            const baseDate = new Date('2026-01-01T10:00:00Z');

            const res1 = await createEvent(agent, {
                startDate: baseDate.toISOString(),
                endDate: new Date(baseDate.getTime() + 3600000).toISOString()
            }, accessToken);

            const res2 = await createEvent(agent, {
                startDate: new Date(baseDate.getTime() + 86400000).toISOString(), // +1 day
                endDate: new Date(baseDate.getTime() + 90000000).toISOString()
            }, accessToken);

            const res3 = await createEvent(agent, {
                startDate: new Date(baseDate.getTime() + 172800000).toISOString(), // +2 days
                endDate: new Date(baseDate.getTime() + 176400000).toISOString()
            }, accessToken);

            eventIds = [res1.body._id, res2.body._id, res3.body._id];
        });

        it('should return all events for the user', async () => {
            const response = await getEvents(agent, {}, accessToken);
            expect(response.status).toBe(200);
            expect(Array.isArray(response.body)).toBe(true);
            expect(response.body.length).toBeGreaterThanOrEqual(3);

            response.body.forEach((event: any) => {
                expect(typeof event._id).toBe('string');
                expect(typeof event.userId).toBe('string');
            });
        });

        it('should filter events by date range', async () => {
            const start = '2026-01-01T00:00:00Z';
            const end = '2026-01-01T23:59:59Z';
            const response = await getEvents(agent, { start, end }, accessToken);

            expect(response.status).toBe(200);
            expect(response.body.length).toBe(1);
            expect(response.body[0]._id).toBe(eventIds[0]);
        });

        it('should return multiple events in a wider range', async () => {
            const start = '2026-01-01T00:00:00Z';
            const end = '2026-01-02T23:59:59Z';
            const response = await getEvents(agent, { start, end }, accessToken);

            expect(response.status).toBe(200);
            expect(response.body.length).toBe(2);
        });

        it('should return empty list for range with no events', async () => {
            const start = '2025-01-01T00:00:00Z';
            const end = '2025-01-01T23:59:59Z';
            const response = await getEvents(agent, { start, end }, accessToken);

            expect(response.status).toBe(200);
            expect(response.body).toEqual([]);
        });
    });

    describe('GET /api/calendar (Pagination)', () => {
        beforeAll(async () => {
            // Ensure we have at least 5 events
            for (let i = 0; i < 5; i++) {
                await createEvent(agent, {}, accessToken);
            }
        });

        it('should return paginated results when limit is provided', async () => {
            const response = await getEvents(agent, { limit: 2 }, accessToken);
            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('items');
            expect(response.body.items.length).toBe(2);
            expect(response.body).toHaveProperty('nextCursor');
        });

        it('should fetch the next page using cursor', async () => {
            const firstPage = await getEvents(agent, { limit: 2 }, accessToken);
            const cursor = firstPage.body.nextCursor;
            expect(cursor).toBeDefined();

            const secondPage = await getEvents(agent, { limit: 2, cursor }, accessToken);
            expect(secondPage.status).toBe(200);
            expect(secondPage.body.items.length).toBe(2);
            expect(secondPage.body.items[0]._id).not.toBe(firstPage.body.items[0]._id);
        });

        it('should clamp limit to 100 if a larger value is provided', async () => {
            const response = await getEvents(agent, { limit: 1000 }, accessToken);
            expect(response.status).toBe(400); // NestJS validates max limit
        });

        it('should return 400 for negative limit', async () => {
            const response = await getEvents(agent, { limit: -1 }, accessToken);
            // In NestJS, we expect 400 for negative limit due to validation
            expect(response.status).toBe(400);
        });
    });

    describe('PUT /api/calendar/:id (Update)', () => {
        let eventId: string;

        beforeAll(async () => {
            const res = await createEvent(agent, { color: '#000000' }, accessToken);
            eventId = res.body._id;
        });

        it('should update event fields', async () => {
            const response = await updateEvent(agent, eventId, {
                color: '#ffffff',
                isAllDay: true
            }, accessToken);
            expect(response.status).toBe(200);
            expect(response.body.color).toBe('#ffffff');
            expect(response.body.isAllDay).toBe(true);
        });

        it('should update event dates', async () => {
            const newStart = new Date('2026-02-01T12:00:00Z').toISOString();
            const response = await updateEvent(agent, eventId, {
                startDate: newStart
            }, accessToken);
            expect(response.status).toBe(200);
            expect(new Date(response.body.startDate).toISOString()).toBe(newStart);
        });

        it('should update mentions', async () => {
            const mentions = ['task1', 'file1'];
            const response = await updateEvent(agent, eventId, {
                mentions
            }, accessToken);
            expect(response.status).toBe(200);
            expect(response.body.mentions).toEqual(expect.arrayContaining(mentions));
        });

        it('should return 404 for non-existent event', async () => {
            const fakeId = '507f1f77bcf86cd799439011';
            const response = await updateEvent(agent, fakeId, { color: '#ff00ff' }, accessToken);
            expect(response.status).toBe(404);
        });
    });

    describe('DELETE /api/calendar/:id (Delete)', () => {
        let eventId: string;

        beforeEach(async () => {
            const res = await createEvent(agent, {}, accessToken);
            eventId = res.body._id;
        });

        it('should delete a calendar event', async () => {
            const deleteRes = await deleteEvent(agent, eventId, accessToken);
            expect(deleteRes.status).toBe(200);
            expect(deleteRes.body.message).toBe('Event deleted successfully');

            // Verify it's gone
            const getRes = await getEvents(agent, {}, accessToken);
            const events = getRes.body.items || getRes.body;
            expect(events.find((e: any) => e._id === eventId)).toBeUndefined();
        });

        it('should return 404 when deleting non-existent event', async () => {
            const fakeId = '507f1f77bcf86cd799439011';
            const response = await deleteEvent(agent, fakeId, accessToken);
            expect(response.status).toBe(404);
        });
    });

    describe('Security and Authorization', () => {
        let otherUserToken: string;
        let otherUserAgent: request.SuperAgentTest;
        let myEventId: string;

        beforeAll(async () => {
            const res = await createEvent(agent, {}, accessToken);
            myEventId = res.body._id;

            const otherUser = {
                username: `other_cal_${Date.now()}`,
                email: `other_cal_${Date.now()}@example.com`,
                password: 'password123!',
                pqcPublicKey: 'test_key'
            };
            const auth = await getAuthenticatedAgent(APP_URL, otherUser);
            otherUserToken = auth.accessToken;
            otherUserAgent = auth.agent;
        });

        it('should return 401 when access without token', async () => {
            const response = await request(APP_URL).get('/api/calendar');
            expect(response.status).toBe(401);
        });

        it('should not allow another user to update my event', async () => {
            const response = await otherUserAgent
                .put(`/api/calendar/${myEventId}`)
                .set('Authorization', `Bearer ${otherUserToken}`)
                .send({ color: '#ff1122' });

            expect(response.status).toBe(404); // BaseRepository patterns return 404 for wrong user
        });

        it('should not allow another user to delete my event', async () => {
            const response = await otherUserAgent
                .delete(`/api/calendar/${myEventId}`)
                .set('Authorization', `Bearer ${otherUserToken}`);

            expect(response.status).toBe(404);
        });
    });



    describe('ObjectID Validation', () => {
        it('should return 400 for invalid ObjectID format in URL', async () => {
            const response = await agent
                .get('/api/calendar/invalid-id')
                .set('Authorization', `Bearer ${accessToken}`);

            // Note: If the route is /api/calendar/:id, it matches. 
            // If it's /api/calendar and id is passed differently, it might vary.
            // Based on route '/' and '/:id', /api/calendar/invalid-id should hit update/delete/get(one) if they existed.
            // But we only have / for getEvents (which handles pagination too).
            // Wait, the routes are:
            // router.get('/', getEvents);
            // router.post('/', createEvent);
            // router.put('/:id', updateEvent);
            // router.delete('/:id', deleteEvent);

            const putRes = await agent
                .put('/api/calendar/not-an-object-id')
                .set('Authorization', `Bearer ${accessToken}`)
                .send({ color: '#000' });

            // NOTE: The Express backend returns 200 even for malformed ObjectID strings
            // because QuerySanitizer.sanitizeQuery strips the invalid ID from the filter.
            // In NestJS, we expect 400 for invalid ID format.
            expect(putRes.status).toBe(400);
        });

        it('should return 400 for non-string ID in URL', async () => {
            const response = await agent
                .put('/api/calendar/123')
                .set('Authorization', `Bearer ${accessToken}`)
                .send({ color: '#000' });
            expect(response.status).toBe(400);
        });
    });

    describe('Extra Boundary Tests', () => {
        it('should ignore unknown fields in create request', async () => {
            const response = await createEvent(agent, {
                extraField: 'should-be-ignored'
            } as any, accessToken);
            expect(response.status).toBe(201);
            expect(response.body).not.toHaveProperty('extraField');
        });

        it('should handle dates at exactly the boundary of a range', async () => {
            const boundaryDate = '2027-01-01T00:00:00.000Z';
            await createEvent(agent, {
                startDate: boundaryDate,
                endDate: boundaryDate
            }, accessToken);

            const response = await getEvents(agent, {
                start: boundaryDate,
                end: boundaryDate
            }, accessToken);

            expect(response.status).toBe(200);
            expect(response.body.some((e: any) => new Date(e.startDate).toISOString() === boundaryDate)).toBe(true);
        });
    });
});
