import apiClient from './api';

const PREFIX = '/tasks';

// Types for plaintext task data (after decryption)
export interface Task {
    _id: string;
    title: string;
    description: string;
    dueDate?: string;
    priority: 'high' | 'medium' | 'low';
    status: 'todo' | 'in_progress' | 'done';
    order: number;
    createdAt: string;
    updatedAt: string;
}

export interface TaskInput {
    title: string;
    description: string;
}

// Types for encrypted task data (from/to backend)
export interface EncryptedTaskPayload {
    encryptedData: string;
    encapsulatedKey: string;
    encryptedSymmetricKey: string;
}

export interface EncryptedTask extends EncryptedTaskPayload {
    _id: string;
    userId: string;
    dueDate?: string;
    priority: 'high' | 'medium' | 'low';
    status: 'todo' | 'in_progress' | 'done';
    order: number;
    recordHash: string;
    createdAt: string;
    updatedAt: string;
}

export interface CreateTaskInput extends EncryptedTaskPayload {
    dueDate?: string;
    priority?: 'high' | 'medium' | 'low';
    status?: 'todo' | 'in_progress' | 'done';
    recordHash: string;
    mentions?: string[];
}

export interface UpdateTaskInput extends Partial<EncryptedTaskPayload> {
    dueDate?: string;
    priority?: 'high' | 'medium' | 'low';
    status?: 'todo' | 'in_progress' | 'done';
    order?: number;
    recordHash?: string;
    mentions?: string[];
}

export interface ReorderUpdate {
    id: string;
    status?: 'todo' | 'in_progress' | 'done';
    order: number;
}

export interface PaginatedTasks {
    items: EncryptedTask[];
    nextCursor: string | null;
}

const taskService = {
    getTasks: async (filters?: { status?: string; priority?: string }): Promise<EncryptedTask[]> => {
        const params = new URLSearchParams();
        if (filters?.status) params.append('status', filters.status);
        if (filters?.priority) params.append('priority', filters.priority);

        const response = await apiClient.get<EncryptedTask[]>(`${PREFIX}`, { params });
        return response.data;
    },

    getTasksPaginated: async (filters: { limit: number; cursor?: string; status?: string; signal?: AbortSignal }): Promise<PaginatedTasks> => {
        const params = new URLSearchParams();
        params.append('limit', filters.limit.toString());
        if (filters.cursor) params.append('cursor', filters.cursor);
        if (filters.status) params.append('status', filters.status);

        const response = await apiClient.get<PaginatedTasks>(`${PREFIX}`, { params, signal: filters.signal });
        return response.data;
    },

    createTask: async (data: CreateTaskInput): Promise<EncryptedTask> => {
        const response = await apiClient.post<EncryptedTask>(`${PREFIX}`, data);
        return response.data;
    },

    updateTask: async (id: string, data: UpdateTaskInput): Promise<EncryptedTask> => {
        const response = await apiClient.put<EncryptedTask>(`${PREFIX}/${id}`, data);
        return response.data;
    },

    deleteTask: async (id: string): Promise<void> => {
        await apiClient.delete(`${PREFIX}/${id}`);
    },

    reorderTasks: async (updates: ReorderUpdate[]): Promise<void> => {
        await apiClient.put(`${PREFIX}/reorder`, { updates });
    },

    /**
     * Fetch upcoming incomplete tasks for dashboard widget
     */
    getUpcomingTasks: async (limit: number = 10): Promise<EncryptedTask[]> => {
        const response = await apiClient.get<EncryptedTask[]>(`${PREFIX}/upcoming`, {
            params: { limit }
        });
        return response.data;
    },
};

export default taskService;
