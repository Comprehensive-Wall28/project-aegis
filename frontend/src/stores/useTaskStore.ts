import { create } from 'zustand';
import taskService from '../services/taskService';
import type { CreateTaskInput, UpdateTaskInput, ReorderUpdate, EncryptedTask } from '../services/taskService';

export interface DecryptedTask {
    _id: string;
    title: string;
    description: string;
    notes: string;
    dueDate?: string;
    priority: 'high' | 'medium' | 'low';
    status: 'todo' | 'in_progress' | 'done';
    order: number;
    createdAt: string;
    updatedAt: string;
}

interface TaskState {
    tasks: DecryptedTask[];
    isLoading: boolean;
    error: string | null;

    fetchTasks: (
        filters?: { status?: string; priority?: string },
        decryptFn?: (tasks: EncryptedTask[]) => Promise<DecryptedTask[] | { tasks: DecryptedTask[], failedTaskIds: string[] }>
    ) => Promise<void>;

    addTask: (
        task: CreateTaskInput,
        decryptFn: (task: EncryptedTask) => Promise<DecryptedTask>,
        mentions?: string[]
    ) => Promise<void>;

    updateTask: (
        id: string,
        updates: UpdateTaskInput,
        decryptFn: (task: EncryptedTask) => Promise<DecryptedTask>,
        mentions?: string[]
    ) => Promise<void>;

    deleteTask: (id: string) => Promise<void>;

    reorderTasks: (updates: ReorderUpdate[]) => Promise<void>;

    // Local state updates for optimistic UI
    updateTaskLocal: (id: string, updates: Partial<DecryptedTask>) => void;
    setTasksLocal: (tasks: DecryptedTask[]) => void;

    // Lightweight fetch for dashboard
    fetchUpcomingTasks: (
        limit: number,
        decryptFn: (tasks: EncryptedTask[]) => Promise<DecryptedTask[] | { tasks: DecryptedTask[], failedTaskIds: string[] }>
    ) => Promise<void>;
}

export const useTaskStore = create<TaskState>((set, get) => ({
    tasks: [],
    isLoading: false,
    error: null,

    fetchTasks: async (filters, decryptFn) => {
        set({ isLoading: true, error: null });
        try {
            const encryptedTasks = await taskService.getTasks(filters);
            if (decryptFn) {
                // @ts-ignore - Handle new return type with failedTaskIds
                const result = await decryptFn(encryptedTasks);

                if (result && typeof result === 'object' && 'tasks' in result) {
                    set({
                        tasks: result.tasks,
                        isLoading: false,
                        error: result.failedTaskIds?.length
                            ? `Warning: ${result.failedTaskIds.length} tasks failed to decrypt.`
                            : null
                    });
                } else {
                    // Fallback for older fn
                    set({ tasks: result as unknown as DecryptedTask[], isLoading: false });
                }
            } else {
                set({ tasks: encryptedTasks as unknown as DecryptedTask[], isLoading: false });
            }
        } catch (error: any) {
            set({ error: error.message || 'Failed to fetch tasks', isLoading: false });
        }
    },

    addTask: async (task, decryptFn, mentions) => {
        set({ error: null });
        try {
            const newEncryptedTask = await taskService.createTask({ ...task, mentions });
            const decryptedTask = await decryptFn(newEncryptedTask);
            set(state => ({
                tasks: [...state.tasks, decryptedTask]
            }));
        } catch (error: any) {
            set({ error: error.message || 'Failed to add task' });
            throw error;
        }
    },

    updateTask: async (id, updates, decryptFn, mentions) => {
        set({ error: null });
        try {
            const updatedEncryptedTask = await taskService.updateTask(id, { ...updates, mentions });
            const decryptedTask = await decryptFn(updatedEncryptedTask);
            set(state => ({
                tasks: state.tasks.map(t => t._id === id ? decryptedTask : t)
            }));
        } catch (error: any) {
            set({ error: error.message || 'Failed to update task' });
            throw error;
        }
    },

    deleteTask: async (id) => {
        set({ error: null });
        try {
            await taskService.deleteTask(id);
            set(state => ({
                tasks: state.tasks.filter(t => t._id !== id)
            }));
        } catch (error: any) {
            set({ error: error.message || 'Failed to delete task' });
            throw error;
        }
    },

    reorderTasks: async (updates) => {
        // Optimistically update local state
        const originalTasks = get().tasks;

        set(state => {
            const newTasks = state.tasks.map(task => {
                const update = updates.find(u => u.id === task._id);
                if (update) {
                    return {
                        ...task,
                        order: update.order,
                        status: update.status || task.status
                    };
                }
                return task;
            });
            return { tasks: newTasks };
        });

        try {
            await taskService.reorderTasks(updates);
        } catch (error: any) {
            // Rollback on error
            set({ tasks: originalTasks, error: error.message || 'Failed to reorder tasks' });
            throw error;
        }
    },

    updateTaskLocal: (id, updates) => {
        set(state => ({
            tasks: state.tasks.map(t => t._id === id ? { ...t, ...updates } : t)
        }));
    },

    setTasksLocal: (tasks) => {
        set({ tasks });
    },

    /**
     * Fetch only upcoming tasks for lightweight dashboard hydration.
     * Merges with existing tasks to avoid overwriting full task lists.
     */
    fetchUpcomingTasks: async (
        limit: number,
        decryptFn: (tasks: EncryptedTask[]) => Promise<DecryptedTask[] | { tasks: DecryptedTask[], failedTaskIds: string[] }>
    ) => {
        try {
            const encryptedTasks = await taskService.getUpcomingTasks(limit);
            if (decryptFn) {
                const result = await decryptFn(encryptedTasks);
                const decrypted = 'tasks' in result ? result.tasks : result as unknown as DecryptedTask[];

                // Merge upcoming tasks into store (don't replace all tasks)
                set(state => {
                    const existingIds = new Set(state.tasks.map(t => t._id));
                    const newTasks = decrypted.filter(t => !existingIds.has(t._id));
                    return { tasks: [...state.tasks, ...newTasks] };
                });
            }
        } catch (error: any) {
            console.error('[TaskStore] Failed to fetch upcoming tasks:', error);
        }
    }
}));
