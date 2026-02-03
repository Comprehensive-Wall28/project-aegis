import { SuperAgentTest } from 'supertest';

export interface TaskData {
    encryptedData: string;
    encapsulatedKey: string;
    encryptedSymmetricKey: string;
    dueDate?: string | Date;
    priority?: 'high' | 'medium' | 'low';
    status?: 'todo' | 'in_progress' | 'done';
    recordHash: string;
    mentions?: string[];
}

export const validTaskData: TaskData = {
    encryptedData: 'test_encrypted_data',
    encapsulatedKey: 'test_key',
    encryptedSymmetricKey: 'test_sym_key',
    priority: 'medium',
    status: 'todo',
    recordHash: 'test_hash'
};

const applyAuth = (req: any, csrfToken: string, accessToken?: string) => {
    req.set('X-XSRF-TOKEN', csrfToken);
    req.set('Cookie', [`XSRF-TOKEN=${csrfToken}`]); // Manually set CSRF cookie
    if (accessToken) {
        req.set('Authorization', `Bearer ${accessToken}`);
    }
    return req;
};

export const createTask = async (
    agent: SuperAgentTest,
    csrfToken: string,
    data: Partial<TaskData> = {},
    accessToken?: string
) => {
    const req = agent.post('/api/tasks');
    applyAuth(req, csrfToken, accessToken);
    return req.send({ ...validTaskData, ...data });
};

export const getTasks = async (
    agent: SuperAgentTest,
    csrfToken: string,
    params: { status?: string; priority?: string; limit?: number; cursor?: string } = {},
    accessToken?: string
) => {
    const req = agent.get('/api/tasks').query(params);
    applyAuth(req, csrfToken, accessToken);
    return req;
};

export const updateTask = async (
    agent: SuperAgentTest,
    csrfToken: string,
    taskId: string,
    data: any,
    accessToken?: string
) => {
    const req = agent.put(`/api/tasks/${taskId}`);
    applyAuth(req, csrfToken, accessToken);
    return req.send(data);
};

export const deleteTask = async (
    agent: SuperAgentTest,
    csrfToken: string,
    taskId: string,
    accessToken?: string
) => {
    const req = agent.delete(`/api/tasks/${taskId}`);
    applyAuth(req, csrfToken, accessToken);
    return req;
};

export const reorderTasks = async (
    agent: SuperAgentTest,
    csrfToken: string,
    updates: Array<{ id: string; status?: string; order: number }>,
    accessToken?: string
) => {
    const req = agent.put('/api/tasks/reorder');
    applyAuth(req, csrfToken, accessToken);
    return req.send({ updates });
};
