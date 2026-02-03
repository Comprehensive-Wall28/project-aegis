/**
 * Task fixtures for E2E testing
 * Provides valid and invalid task data for different test scenarios
 */

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

// Base valid task data
export const validTaskData: TaskData = {
    encryptedData: 'test_encrypted_data_base64',
    encapsulatedKey: 'test_kem_encapsulated_key_hex',
    encryptedSymmetricKey: 'test_wrapped_aes_key_hex',
    priority: 'medium',
    status: 'todo',
    recordHash: 'sha256_hash_for_integrity_verification'
};

// Tasks in different statuses for status filter testing
export const todoTask: TaskData = {
    ...validTaskData,
    encryptedData: 'encrypted_todo_task_data',
    recordHash: 'todo_task_hash'
};

export const inProgressTask: TaskData = {
    ...validTaskData,
    status: 'in_progress',
    encryptedData: 'encrypted_in_progress_task_data',
    recordHash: 'in_progress_task_hash'
};

export const doneTask: TaskData = {
    ...validTaskData,
    status: 'done',
    encryptedData: 'encrypted_done_task_data',
    recordHash: 'done_task_hash'
};

// Tasks with different priorities for priority filter testing
export const highPriorityTask: TaskData = {
    ...validTaskData,
    priority: 'high',
    encryptedData: 'encrypted_high_priority_data',
    recordHash: 'high_priority_hash'
};

export const mediumPriorityTask: TaskData = {
    ...validTaskData,
    priority: 'medium',
    encryptedData: 'encrypted_medium_priority_data',
    recordHash: 'medium_priority_hash'
};

export const lowPriorityTask: TaskData = {
    ...validTaskData,
    priority: 'low',
    encryptedData: 'encrypted_low_priority_data',
    recordHash: 'low_priority_hash'
};

// Tasks with due dates for upcoming tasks testing
export const upcomingTaskTomorrow = (date?: Date): TaskData => {
    const tomorrow = date || new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    return {
        ...validTaskData,
        status: 'todo',
        dueDate: tomorrow.toISOString(),
        encryptedData: 'encrypted_upcoming_tomorrow',
        recordHash: 'upcoming_tomorrow_hash'
    };
};

export const upcomingTaskNextWeek = (date?: Date): TaskData => {
    const nextWeek = date || new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    
    return {
        ...validTaskData,
        status: 'todo',
        dueDate: nextWeek.toISOString(),
        encryptedData: 'encrypted_upcoming_next_week',
        recordHash: 'upcoming_next_week_hash'
    };
};

export const completedTaskWithDueDate: TaskData = {
    ...validTaskData,
    status: 'done',
    dueDate: new Date(Date.now() + 86400000).toISOString(),
    encryptedData: 'encrypted_completed_task',
    recordHash: 'completed_task_hash'
};

// Tasks for reorder testing (same status, different orders)
export const reorderTestTasks = [
    { status: 'todo', order: 0 },
    { status: 'todo', order: 1 },
    { status: 'todo', order: 2 },
    { status: 'in_progress', order: 0 },
    { status: 'done', order: 0 }
].map((item, index) => ({
    ...validTaskData,
    status: item.status as TaskData['status'],
    encryptedData: `encrypted_reorder_task_${index}`,
    recordHash: `reorder_task_hash_${index}`
}));

// Invalid task data for validation testing
export const invalidTaskData = {
    missingRequired: {
        encryptedData: 'only_encrypted_data',
        // Missing encapsulatedKey, encryptedSymmetricKey, recordHash
    },
    
    missingEncryptedData: {
        encapsulatedKey: 'test_key',
        encryptedSymmetricKey: 'test_sym_key',
        recordHash: 'test_hash'
        // Missing encryptedData
    },
    
    missingEncapsulatedKey: {
        encryptedData: 'test_data',
        encryptedSymmetricKey: 'test_sym_key',
        recordHash: 'test_hash'
        // Missing encapsulatedKey
    },
    
    missingEncryptedSymmetricKey: {
        encryptedData: 'test_data',
        encapsulatedKey: 'test_key',
        recordHash: 'test_hash'
        // Missing encryptedSymmetricKey
    },
    
    missingRecordHash: {
        encryptedData: 'test_data',
        encapsulatedKey: 'test_key',
        encryptedSymmetricKey: 'test_sym_key'
        // Missing recordHash
    },
    
    invalidStatus: {
        ...validTaskData,
        status: 'invalid_status' as any
    },
    
    invalidPriority: {
        ...validTaskData,
        priority: 'extreme' as any
    },
    
    invalidDateFormat: {
        ...validTaskData,
        dueDate: 'not-a-valid-date'
    }
};

// Array of tasks for bulk creation testing
export const bulkTasks: TaskData[] = [
    highPriorityTask,
    mediumPriorityTask,
    lowPriorityTask,
    inProgressTask,
    doneTask
];
