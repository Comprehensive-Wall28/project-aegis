import { create } from 'zustand';
import taskService from '../services/taskService';
import type { CreateTaskInput, UpdateTaskInput, ReorderUpdate, EncryptedTask } from '../services/taskService';
import { queryClient } from '../api/queryClient';

export interface DecryptedTask {
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

type TaskStatus = 'todo' | 'in_progress' | 'done';

const ALL_STATUSES: TaskStatus[] = ['todo', 'in_progress', 'done'];
const PAGE_SIZE = 20;

export interface ColumnPaginationState {
    cursor: string | null;
    hasMore: boolean;
    isLoadingMore: boolean;
}

interface TaskState {
    tasks: DecryptedTask[];
    isLoading: boolean;
    error: string | null;

    /** Per-column pagination state */
    columnState: Record<TaskStatus, ColumnPaginationState>;

    fetchTasks: (
        filters?: { status?: string; priority?: string },
        decryptFn?: (tasks: EncryptedTask[]) => Promise<DecryptedTask[] | { tasks: DecryptedTask[], failedTaskIds: string[] }>
    ) => Promise<void>;

    fetchMoreTasks: (
        status: TaskStatus,
        decryptFn: (tasks: EncryptedTask[]) => Promise<DecryptedTask[] | { tasks: DecryptedTask[], failedTaskIds: string[] }>
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

    // Reset store to initial state (for logout)
    reset: () => void;
}

function makeInitialColumnState(): Record<TaskStatus, ColumnPaginationState> {
    return {
        todo: { cursor: null, hasMore: true, isLoadingMore: false },
        in_progress: { cursor: null, hasMore: true, isLoadingMore: false },
        done: { cursor: null, hasMore: true, isLoadingMore: false },
    };
}

/** Extract decrypted tasks from the polymorphic decryptFn result */
function extractDecrypted(result: DecryptedTask[] | { tasks: DecryptedTask[], failedTaskIds: string[] }): {
    tasks: DecryptedTask[];
    failedCount: number;
} {
    if (Array.isArray(result)) {
        return { tasks: result, failedCount: 0 };
    }
    if (result && typeof result === 'object' && 'tasks' in result) {
        return { tasks: result.tasks, failedCount: result.failedTaskIds?.length ?? 0 };
    }
    return { tasks: [], failedCount: 0 };
}

export const useTaskStore = create<TaskState>((set, get) => ({
    tasks: [],
    isLoading: false,
    error: null,
    columnState: makeInitialColumnState(),

    /**
     * Initial fetch — loads the first page for each status column in parallel.
     * Replaces the old full-list fetch.
     */
    fetchTasks: async (_filters, decryptFn) => {
        if (!decryptFn) {
            set({ tasks: [], isLoading: false, error: 'Decryption function not provided' });
            return;
        }

        set({ isLoading: true, error: null, columnState: makeInitialColumnState() });

        try {
            // Fetch first page for all 3 columns in parallel
            const results = await Promise.all(
                ALL_STATUSES.map(status =>
                    taskService.getTasksPaginated({ limit: PAGE_SIZE, status })
                )
            );

            // Collect all encrypted tasks
            const allEncrypted: EncryptedTask[] = [];
            const newColumnState = makeInitialColumnState();

            ALL_STATUSES.forEach((status, i) => {
                const { items, nextCursor } = results[i];
                allEncrypted.push(...items);
                newColumnState[status] = {
                    cursor: nextCursor,
                    hasMore: nextCursor !== null,
                    isLoadingMore: false,
                };
            });

            // Decrypt all at once
            const result = await decryptFn(allEncrypted);
            const { tasks: decrypted, failedCount } = extractDecrypted(result);

            set({
                tasks: decrypted,
                isLoading: false,
                columnState: newColumnState,
                error: failedCount > 0
                    ? `Warning: ${failedCount} tasks failed to decrypt.`
                    : null,
            });
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to fetch tasks';
            set({ error: errorMessage, isLoading: false });
        }
    },

    /**
     * Load the next page for a single column.
     */
    fetchMoreTasks: async (status, decryptFn) => {
        const { columnState } = get();
        const col = columnState[status];

        // Guard: don't fetch if already loading or no more data
        if (col.isLoadingMore || !col.hasMore) return;

        // Set loading for this column
        set(state => ({
            columnState: {
                ...state.columnState,
                [status]: { ...state.columnState[status], isLoadingMore: true },
            },
        }));

        try {
            const { items, nextCursor } = await taskService.getTasksPaginated({
                limit: PAGE_SIZE,
                cursor: col.cursor ?? undefined,
                status,
            });

            if (items.length === 0) {
                set(state => ({
                    columnState: {
                        ...state.columnState,
                        [status]: { cursor: null, hasMore: false, isLoadingMore: false },
                    },
                }));
                return;
            }

            const result = await decryptFn(items);
            const { tasks: decrypted } = extractDecrypted(result);

            set(state => {
                // Merge new tasks, avoiding duplicates
                const existingIds = new Set(state.tasks.map(t => t._id));
                const newTasks = decrypted.filter(t => !existingIds.has(t._id));

                return {
                    tasks: [...state.tasks, ...newTasks],
                    columnState: {
                        ...state.columnState,
                        [status]: {
                            cursor: nextCursor,
                            hasMore: nextCursor !== null,
                            isLoadingMore: false,
                        },
                    },
                };
            });
        } catch (error) {
            console.error(`[TaskStore] Failed to load more ${status} tasks:`, error);
            set(state => ({
                columnState: {
                    ...state.columnState,
                    [status]: { ...state.columnState[status], isLoadingMore: false },
                },
            }));
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

            // Invalidate dashboard activity to show new task instantly
            queryClient.invalidateQueries({ queryKey: ['dashboardActivity'] });
            queryClient.invalidateQueries({ queryKey: ['decryptedDashboardTasks'] });
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

            // Invalidate dashboard activity to reflect updates (e.g. status change)
            queryClient.invalidateQueries({ queryKey: ['dashboardActivity'] });
            queryClient.invalidateQueries({ queryKey: ['decryptedDashboardTasks'] });
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

            // Invalidate dashboard to remove deleted task
            queryClient.invalidateQueries({ queryKey: ['dashboardActivity'] });
            queryClient.invalidateQueries({ queryKey: ['decryptedDashboardTasks'] });
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

            // Invalidate dashboard to reflect new order
            queryClient.invalidateQueries({ queryKey: ['dashboardActivity'] });
            queryClient.invalidateQueries({ queryKey: ['decryptedDashboardTasks'] });
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
                const { tasks: decrypted } = extractDecrypted(result);

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
    },

    /**
     * Reset the store to its initial state.
     * Called during logout to clear user data.
     */
    reset: () => {
        set({
            tasks: [],
            isLoading: false,
            error: null,
            columnState: makeInitialColumnState(),
        });
    }
}));
