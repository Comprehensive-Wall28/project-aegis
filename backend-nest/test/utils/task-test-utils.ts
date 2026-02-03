import { SuperAgentTest } from 'supertest';
import { TaskData, validTaskData } from '../fixtures/tasks.fixture';

export type { TaskData } from '../fixtures/tasks.fixture';

const applyAuth = (req: any, accessToken?: string) => {
    if (accessToken) {
        req.set('Authorization', `Bearer ${accessToken}`);
    }
    return req;
};

export const createTask = async (
    agent: SuperAgentTest,
    data: Partial<TaskData> = {},
    accessToken?: string
) => {
    const req = agent.post('/api/tasks');
    applyAuth(req, accessToken);
    return req.send({ ...validTaskData, ...data });
};

export const getTasks = async (
    agent: SuperAgentTest,
    params: { status?: string; priority?: string; limit?: number; cursor?: string } = {},
    accessToken?: string
) => {
    const req = agent.get('/api/tasks').query(params);
    applyAuth(req, accessToken);
    return req;
};

export const updateTask = async (
    agent: SuperAgentTest,
    taskId: string,
    data: any,
    accessToken?: string
) => {
    const req = agent.put(`/api/tasks/${taskId}`);
    applyAuth(req, accessToken);
    return req.send(data);
};

export const deleteTask = async (
    agent: SuperAgentTest,
    taskId: string,
    accessToken?: string
) => {
    const req = agent.delete(`/api/tasks/${taskId}`);
    applyAuth(req, accessToken);
    return req;
};

export const reorderTasks = async (
    agent: SuperAgentTest,
    updates: Array<{ id: string; status?: string; order: number }>,
    accessToken?: string
) => {
    const req = agent.put('/api/tasks/reorder');
    applyAuth(req, accessToken);
    return req.send({ updates });
};
