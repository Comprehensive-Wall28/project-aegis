import { SuperAgentTest } from 'supertest';
import { FolderData, validFolderData } from '../fixtures/folders.fixture';

export type { FolderData } from '../fixtures/folders.fixture';

const applyAuth = (req: any, accessToken?: string) => {
    if (accessToken) {
        req.set('Authorization', `Bearer ${accessToken}`);
    }
    return req;
};

export const createFolder = async (
    agent: SuperAgentTest,
    data: Partial<FolderData> = {},
    accessToken?: string
) => {
    const req = agent.post('/api/folders');
    applyAuth(req, accessToken);
    return req.send({ ...validFolderData, ...data });
};

export const getFolders = async (
    agent: SuperAgentTest,
    params: { parentId?: string | null } = {},
    accessToken?: string
) => {
    const req = agent.get('/api/folders').query(params);
    applyAuth(req, accessToken);
    return req;
};

export const getFolder = async (
    agent: SuperAgentTest,
    folderId: string,
    accessToken?: string
) => {
    const req = agent.get(`/api/folders/${folderId}`);
    applyAuth(req, accessToken);
    return req;
};

export const updateFolder = async (
    agent: SuperAgentTest,
    folderId: string,
    data: { name?: string; color?: string },
    accessToken?: string
) => {
    const req = agent.put(`/api/folders/${folderId}`);
    applyAuth(req, accessToken);
    return req.send(data);
};

export const deleteFolder = async (
    agent: SuperAgentTest,
    folderId: string,
    accessToken?: string
) => {
    const req = agent.delete(`/api/folders/${folderId}`);
    applyAuth(req, accessToken);
    return req;
};

export const moveFiles = async (
    agent: SuperAgentTest,
    updates: Array<{ fileId: string; encryptedKey: string; encapsulatedKey: string }>,
    folderId: string | null,
    accessToken?: string
) => {
    const req = agent.put('/api/folders/move-files');
    applyAuth(req, accessToken);
    return req.send({ updates, folderId });
};
