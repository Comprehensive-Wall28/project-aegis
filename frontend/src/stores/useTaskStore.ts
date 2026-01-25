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
                const result = await decryptFn(encryptedTasks);

                if (Array.isArray(result)) {
                    set({ tasks: result, isLoading: false });
                } else if (result && typeof result === 'object' && 'tasks' in result) {
                    set({
                        tasks: result.tasks,
                        isLoading: false,
                        error: result.failedTaskIds?.length
                            ? `Warning: ${result.failedTaskIds.length} tasks failed to decrypt.`
                            : null
                    });
                } else {
                    // unexpected result shape
                    set({ tasks: [], isLoading: false, error: 'Failed to decrypt tasks: Invalid return format' });
                }
            } else {
                set({
                    tasks: [],
                    isLoading: false,
                    error: 'Decryption function not provided'
                });
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to fetch tasks';
            set({ error: errorMessage, isLoading: false });
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
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to add task';
            set({ error: errorMessage });
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
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to update task';
            set({ error: errorMessage });
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
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to delete task';
            set({ error: errorMessage });
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
        } catch (error) {
            // Rollback on error
            const errorMessage = error instanceof Error ? error.message : 'Failed to reorder tasks';
            set({ tasks: originalTasks, error: errorMessage });
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
                // Type guard to handle both return types
                let decrypted: DecryptedTask[];
                if (Array.isArray(result)) {
                    decrypted = result;
                } else if (result && 'tasks' in result) {
                    decrypted = result.tasks;
                } else {
                    decrypted = [];
                }

                // Merge upcoming tasks into store (update existing or add new)
                set(state => {
                    const taskMap = new Map(state.tasks.map(t => [t._id, t]));
                    decrypted.forEach(t => taskMap.set(t._id, t));
                    return { tasks: Array.from(taskMap.values()) };
                });
            }
        } catch (error) {
            console.error('[TaskStore] Failed to fetch upcoming tasks:', error);
        }
    }
}));
