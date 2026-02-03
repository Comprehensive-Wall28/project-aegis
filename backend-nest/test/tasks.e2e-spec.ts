import * as request from 'supertest';
import { getAuthenticatedAgent } from './helpers/auth.helper';
import { validTaskData } from './fixtures/tasks.fixture';
import { createTask, getTasks, updateTask, deleteTask, reorderTasks } from './utils/task-test-utils';

const APP_URL = 'http://127.0.0.1:5000';

describe('Task Domain E2E Tests (Express Backend)', () => {
    let agent: request.SuperAgentTest;
    let csrfToken: string;
    let accessToken: string;
    let user: any;

    beforeAll(async () => {
        try {
            user = {
                username: `task_user_${Date.now()}`,
                email: `task_user_${Date.now()}@example.com`,
                password: 'password123!',
                pqcPublicKey: 'test_pqc_key'
            };

            const auth = await getAuthenticatedAgent(APP_URL, user);
            agent = auth.agent;
            csrfToken = auth.csrfToken;
            accessToken = auth.accessToken;

            if (!agent || !accessToken) {
                throw new Error('Failed to create authenticated agent');
            }

        } catch (error) {
            console.error('Setup failed:', error);
            throw error;
        }
    });

    describe('POST /api/tasks (Create)', () => {
        it('should create a task with valid data', async () => {
            const response = await createTask(agent, csrfToken, {}, accessToken);
            expect(response.status).toBe(201);
            expect(response.body).toHaveProperty('_id');
            expect(typeof response.body._id).toBe('string');
            expect(response.body.userId).toBeDefined();
            expect(typeof response.body.userId).toBe('string');
            expect(response.body.status).toBe('todo');
            expect(response.body.priority).toBe('medium');
        });

        it('should create a task with custom status and priority', async () => {
            const response = await createTask(agent, csrfToken, {
                status: 'in_progress',
                priority: 'high'
            }, accessToken);
            expect(response.status).toBe(201);
            expect(response.body.status).toBe('in_progress');
            expect(response.body.priority).toBe('high');
        });

        it('should fail if required fields are missing', async () => {
            const response = await agent
                .post('/api/tasks')
                .set('X-XSRF-TOKEN', csrfToken)
                .set('Cookie', [`XSRF-TOKEN=${csrfToken}`])
                .set('Authorization', `Bearer ${accessToken}`)
                .send({ encryptedData: 'only_this' });

            expect(response.status).toBe(400);
            expect(response.body.message).toContain('Missing required fields');
        });

        it('should reject invalid status values', async () => {
            const response = await createTask(agent, csrfToken, { status: 'invalid_status' as any }, accessToken);
            expect(response.status).toBe(400);
            expect(response.body.message).toContain('Must be one of');
        });

        it('should reject invalid priority values', async () => {
            const response = await createTask(agent, csrfToken, { priority: 'extreme' as any }, accessToken);
            expect(response.status).toBe(400);
            expect(response.body.message).toContain('Must be one of');
        });
    });

    describe('GET /api/tasks (List)', () => {
        beforeAll(async () => {
            // Ensure at least 3 tasks exist for the user
            await createTask(agent, csrfToken, { status: 'todo', priority: 'low' }, accessToken);
            await createTask(agent, csrfToken, { status: 'in_progress', priority: 'medium' }, accessToken);
            await createTask(agent, csrfToken, { status: 'done', priority: 'high' }, accessToken);
        });

        it('should return all tasks for the user', async () => {
            const response = await getTasks(agent, csrfToken, {}, accessToken);
            expect(response.status).toBe(200);
            expect(Array.isArray(response.body)).toBe(true);
            expect(response.body.length).toBeGreaterThanOrEqual(3);

            // Check ID patterns
            response.body.forEach((task: any) => {
                expect(typeof task._id).toBe('string');
                expect(typeof task.userId).toBe('string');
            });
        });

        it('should filter tasks by status', async () => {
            const response = await getTasks(agent, csrfToken, { status: 'in_progress' }, accessToken);
            expect(response.status).toBe(200);
            expect(response.body.every((t: any) => t.status === 'in_progress')).toBe(true);
        });

        it('should filter tasks by priority', async () => {
            const response = await getTasks(agent, csrfToken, { priority: 'high' }, accessToken);
            expect(response.status).toBe(200);
            expect(response.body.every((t: any) => t.priority === 'high')).toBe(true);
        });

        it('should combine status and priority filters', async () => {
            const response = await getTasks(agent, csrfToken, { status: 'done', priority: 'high' }, accessToken);
            expect(response.status).toBe(200);
            expect(response.body.every((t: any) => t.status === 'done' && t.priority === 'high')).toBe(true);
        });

        it('should respect the limit parameter', async () => {
            const response = await getTasks(agent, csrfToken, { limit: 2 }, accessToken);
            expect(response.status).toBe(200);
            if (Array.isArray(response.body)) {
                expect(response.body.length).toBeLessThanOrEqual(2);
            } else {
                expect(response.body).toHaveProperty('items');
                expect((response.body as any).items.length).toBeLessThanOrEqual(2);
            }
        });

        it('should return 200 for empty results', async () => {
            const response = await getTasks(agent, csrfToken, { status: 'todo', priority: 'high' }, accessToken);
            expect(response.status).toBe(200);
            // This might or might not return results depending on what was created, 
            // but the status code should be 200.
            expect(Array.isArray(response.body)).toBe(true);
        });

        it('should support cursor-based pagination', async () => {
            // Create multiple tasks to test pagination
            await createTask(agent, csrfToken, {}, accessToken);
            await createTask(agent, csrfToken, {}, accessToken);
            await createTask(agent, csrfToken, {}, accessToken);

            const firstPage = await agent
                .get('/api/tasks')
                .query({ limit: 2 })
                .set('Authorization', `Bearer ${accessToken}`)
                .set('X-XSRF-TOKEN', csrfToken)
                .set('Cookie', [`XSRF-TOKEN=${csrfToken}`]);

            expect(firstPage.status).toBe(200);
            expect(firstPage.body).toHaveProperty('items');
            expect(firstPage.body).toHaveProperty('nextCursor');
            expect(firstPage.body.items.length).toBe(2);

            if (firstPage.body.nextCursor) {
                const secondPage = await agent
                    .get('/api/tasks')
                    .query({ limit: 2, cursor: firstPage.body.nextCursor })
                    .set('Authorization', `Bearer ${accessToken}`)
                    .set('X-XSRF-TOKEN', csrfToken)
                    .set('Cookie', [`XSRF-TOKEN=${csrfToken}`]);

                expect(secondPage.status).toBe(200);
                expect(secondPage.body).toHaveProperty('items');
                // Should have different items than first page
                expect(secondPage.body.items[0]._id).not.toBe(firstPage.body.items[0]._id);
            }
        });
    });

    describe('PUT /api/tasks/:id (Update)', () => {
        let taskId: string;

        beforeAll(async () => {
            const res = await createTask(agent, csrfToken, {}, accessToken);
            taskId = res.body._id;
        });

        it('should update task status', async () => {
            const response = await updateTask(agent, csrfToken, taskId, { status: 'done' }, accessToken);
            expect(response.status).toBe(200);
            expect(response.body.status).toBe('done');
        });

        it('should update task priority', async () => {
            const response = await updateTask(agent, csrfToken, taskId, { priority: 'high' }, accessToken);
            expect(response.status).toBe(200);
            expect(response.body.priority).toBe('high');
        });

        it('should update multiple fields simultaneously', async () => {
            const response = await updateTask(agent, csrfToken, taskId, {
                status: 'todo',
                priority: 'low',
                encryptedData: 'updated_data'
            }, accessToken);
            expect(response.status).toBe(200);
            expect(response.body.status).toBe('todo');
            expect(response.body.priority).toBe('low');
            expect(response.body.encryptedData).toBe('updated_data');
        });

        it('should return 404 for non-existent task ID', async () => {
            const fakeId = '507f1f77bcf86cd799439011';
            const response = await updateTask(agent, csrfToken, fakeId, { status: 'done' }, accessToken);
            expect(response.status).toBe(404);
        });

        it('should return 400 for non-string task ID', async () => {
            // In Express, hit a PUT with an ID that is not matched or fails validation
            const response = await agent
                .put('/api/tasks/ ')
                .set('X-XSRF-TOKEN', csrfToken)
                .set('Cookie', [`XSRF-TOKEN=${csrfToken}`])
                .set('Authorization', `Bearer ${accessToken}`)
                .send({ status: 'done' });
            expect([400, 404]).toContain(response.status);
        });
    });

    describe('DELETE /api/tasks/:id (Delete)', () => {
        let taskId: string;

        beforeEach(async () => {
            const res = await createTask(agent, csrfToken, {}, accessToken);
            taskId = res.body._id;
        });

        it('should delete a task by ID', async () => {
            const deleteRes = await deleteTask(agent, csrfToken, taskId, accessToken);
            expect(deleteRes.status).toBe(200);
            expect(deleteRes.body.message).toBe('Task deleted successfully');

            // Verify it's gone
            const listRes = await getTasks(agent, csrfToken, {}, accessToken);
            expect(listRes.body.find((t: any) => t._id === taskId)).toBeUndefined();
        });

        it('should return 404 when deleting already deleted task', async () => {
            await deleteTask(agent, csrfToken, taskId, accessToken);
            const response = await deleteTask(agent, csrfToken, taskId, accessToken);
            expect(response.status).toBe(404);
        });
    });

    describe('Unauthorized Access', () => {
        it('should return 401 when creating task without token', async () => {
            const response = await agent.post('/api/tasks').send(validTaskData);
            expect(response.status).toBe(401);
        });

        it('should return 401 when listing tasks without token', async () => {
            const response = await agent.get('/api/tasks');
            expect(response.status).toBe(401);
        });

        it('should return 401 when updating task without token', async () => {
            const response = await agent.put('/api/tasks/some-id').send({ status: 'done' });
            expect(response.status).toBe(401);
        });

        it('should return 401 when deleting task without token', async () => {
            const response = await agent.delete('/api/tasks/some-id');
            expect(response.status).toBe(401);
        });
    });

    describe('PUT /api/tasks/reorder', () => {
        let task1Id: string;
        let task2Id: string;

        beforeAll(async () => {
            const res1 = await createTask(agent, csrfToken, { status: 'todo' }, accessToken);
            const res2 = await createTask(agent, csrfToken, { status: 'todo' }, accessToken);
            task1Id = res1.body._id;
            task2Id = res2.body._id;
        });

        it('should reorder tasks within a column', async () => {
            const response = await reorderTasks(agent, csrfToken, [
                { id: task1Id, order: 1 },
                { id: task2Id, order: 2 }
            ], accessToken);
            expect(response.status).toBe(200);
            expect(response.body.message).toBe('Tasks reordered successfully');
        });

        it('should reorder and change status simultaneously', async () => {
            const response = await reorderTasks(agent, csrfToken, [
                { id: task1Id, status: 'in_progress', order: 0 }
            ], accessToken);
            expect(response.status).toBe(200);

            const listRes = await getTasks(agent, csrfToken, { status: 'in_progress' }, accessToken);
            expect(listRes.body.some((t: any) => t._id === task1Id)).toBe(true);
        });

        it('should return 400 for invalid updates format', async () => {
            const response = await agent
                .put('/api/tasks/reorder')
                .set('X-XSRF-TOKEN', csrfToken)
                .set('Cookie', [`XSRF-TOKEN=${csrfToken}`])
                .set('Authorization', `Bearer ${accessToken}`)
                .send({ updates: 'not-an-array' });
            expect(response.status).toBe(400);
        });
    });

    describe('GET /api/tasks/upcoming', () => {
        beforeAll(async () => {
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            await createTask(agent, csrfToken, { dueDate: tomorrow.toISOString(), status: 'todo' }, accessToken);
        });

        it('should return upcoming tasks with due dates', async () => {
            const response = await agent
                .get('/api/tasks/upcoming')
                .set('Authorization', `Bearer ${accessToken}`);
            expect(response.status).toBe(200);
            expect(Array.isArray(response.body)).toBe(true);
            expect(response.body.some((t: any) => t.dueDate !== null)).toBe(true);
        });

        it('should limit the number of upcoming tasks', async () => {
            const response = await agent
                .get('/api/tasks/upcoming?limit=1')
                .set('Authorization', `Bearer ${accessToken}`);
            expect(response.status).toBe(200);
            expect(response.body.length).toBeLessThanOrEqual(1);
        });
    });

    describe('CSRF Protection Check', () => {
        it('should return 403 when X-XSRF-TOKEN header is missing', async () => {
            const response = await agent
                .post('/api/tasks')
                .set('Cookie', [`XSRF-TOKEN=${csrfToken}`])
                .set('Authorization', `Bearer ${accessToken}`)
                .send(validTaskData);
            expect(response.status).toBe(403);
        });

        it('should return 403 when XSRF-TOKEN cookie is missing', async () => {
            const response = await agent
                .post('/api/tasks')
                .set('X-XSRF-TOKEN', csrfToken)
                .set('Authorization', `Bearer ${accessToken}`)
                .send(validTaskData);
            expect(response.status).toBe(403);
        });

        it('should return 403 when tokens do not match', async () => {
            const response = await agent
                .post('/api/tasks')
                .set('X-XSRF-TOKEN', 'wrong-token')
                .set('Cookie', [`XSRF-TOKEN=${csrfToken}`])
                .set('Authorization', `Bearer ${accessToken}`)
                .send(validTaskData);
            expect(response.status).toBe(403);
        });
    });

    describe('Task Ownership (Advanced)', () => {
        let otherUserToken: string;
        let otherUserAgent: request.SuperAgentTest;
        let myTaskId: string;

        beforeAll(async () => {
            const res = await createTask(agent, csrfToken, {}, accessToken);
            myTaskId = res.body._id;

            const otherUser = {
                username: `other_${Date.now()}`,
                email: `other_${Date.now()}@example.com`,
                password: 'password123!',
                pqcPublicKey: 'test_key'
            };
            const auth = await getAuthenticatedAgent(APP_URL, otherUser);
            otherUserToken = auth.accessToken;
            otherUserAgent = auth.agent;
        });

        it('should not allow another user to update my task', async () => {
            // Need a CSRF token for the OTHER user's agent
            const csrfRes = await otherUserAgent.get('/api/auth/csrf-token');
            const otherCsrf = csrfRes.body.csrfToken;

            const response = await otherUserAgent
                .put(`/api/tasks/${myTaskId}`)
                .set('X-XSRF-TOKEN', otherCsrf)
                .set('Cookie', [`XSRF-TOKEN=${otherCsrf}`])
                .set('Authorization', `Bearer ${otherUserToken}`)
                .send({ status: 'done' });

            // Should return 404 because TaskRepository.updateByIdAndUser filters by userId
            expect(response.status).toBe(404);
        });

        it('should not allow another user to delete my task', async () => {
            const csrfRes = await otherUserAgent.get('/api/auth/csrf-token');
            const otherCsrf = csrfRes.body.csrfToken;

            const response = await otherUserAgent
                .delete(`/api/tasks/${myTaskId}`)
                .set('X-XSRF-TOKEN', otherCsrf)
                .set('Cookie', [`XSRF-TOKEN=${otherCsrf}`])
                .set('Authorization', `Bearer ${otherUserToken}`);

            // Should return 404 because TaskRepository.deleteByIdAndUser filters by userId
            expect(response.status).toBe(404);
        });
    });
});
