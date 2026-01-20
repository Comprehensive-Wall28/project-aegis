export const TASK_STATUS = {
    TODO: 'todo',
    IN_PROGRESS: 'in_progress',
    DONE: 'done',
} as const;

export const TASK_PRIORITY = {
    HIGH: 'high',
    MEDIUM: 'medium',
    LOW: 'low',
} as const;

export type TaskStatus = typeof TASK_STATUS[keyof typeof TASK_STATUS];
export type TaskPriority = typeof TASK_PRIORITY[keyof typeof TASK_PRIORITY];

export const TASK_COLUMNS_CONFIG = [
    { id: TASK_STATUS.TODO, title: 'To Do', color: '#607d8b' },
    { id: TASK_STATUS.IN_PROGRESS, title: 'In Progress', color: '#ff9800' },
    { id: TASK_STATUS.DONE, title: 'Done', color: '#4caf50' },
] as const;

export const TASK_PRIORITY_CONFIG = {
    [TASK_PRIORITY.HIGH]: { label: 'High', color: '#f44336' },
    [TASK_PRIORITY.MEDIUM]: { label: 'Medium', color: '#ff9800' },
    [TASK_PRIORITY.LOW]: { label: 'Low', color: '#4caf50' },
} as const;

export const TASK_STATUS_LABELS = {
    [TASK_STATUS.TODO]: 'To Do',
    [TASK_STATUS.IN_PROGRESS]: 'In Progress',
    [TASK_STATUS.DONE]: 'Done',
};
