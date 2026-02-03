import { SuperAgentTest } from 'supertest';
import { FolderData, validFolderData } from '../fixtures/folders.fixture';

export type { FolderData } from '../fixtures/folders.fixture';

const applyAuth = (req: any, csrfToken: string, accessToken?: string) => {
    req.set('X-XSRF-TOKEN', csrfToken);
    req.set('Cookie', [`XSRF-TOKEN=${csrfToken}`]);
    if (accessToken) {
        req.set('Authorization', `Bearer ${accessToken}`);
    }
    return req;
};

export const createFolder = async (
    agent: SuperAgentTest,
    csrfToken: string,
    data: Partial<FolderData> = {},
    accessToken?: string
) => {
    const req = agent.post('/api/folders');
    applyAuth(req, csrfToken, accessToken);
    return req.send({ ...validFolderData, ...data });
};

export const getFolders = async (
    agent: SuperAgentTest,
    csrfToken: string,
    params: { parentId?: string | null } = {},
    accessToken?: string
) => {
    const req = agent.get('/api/folders').query(params);
    applyAuth(req, csrfToken, accessToken);
    return req;
};

export const getFolder = async (
    agent: SuperAgentTest,
    csrfToken: string,
    folderId: string,
    accessToken?: string
) => {
    const req = agent.get(`/api/folders/${folderId}`);
    applyAuth(req, csrfToken, accessToken);
    return req;
};

export const updateFolder = async (
    agent: SuperAgentTest,
    csrfToken: string,
    folderId: string,
    data: { name?: string; color?: string },
    accessToken?: string
) => {
    const req = agent.put(`/api/folders/${folderId}`);
    applyAuth(req, csrfToken, accessToken);
    return req.send(data);
};

export const deleteFolder = async (
    agent: SuperAgentTest,
    csrfToken: string,
    folderId: string,
    accessToken?: string
) => {
    const req = agent.delete(`/api/folders/${folderId}`);
    applyAuth(req, csrfToken, accessToken);
    return req;
};

export const moveFiles = async (
    agent: SuperAgentTest,
    csrfToken: string,
    updates: Array<{ fileId: string; encryptedKey: string; encapsulatedKey: string }>,
    folderId: string | null,
    accessToken?: string
) => {
    const req = agent.put('/api/folders/move-files');
    applyAuth(req, csrfToken, accessToken);
    return req.send({ updates, folderId });
};
