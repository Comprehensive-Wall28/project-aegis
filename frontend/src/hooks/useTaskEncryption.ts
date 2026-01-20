import { useCallback } from 'react';
import { useSessionStore } from '../stores/sessionStore';
import {
    encryptTaskData,
    decryptTaskData,
    generateRecordHash,
    type EncryptedTask,
    type EncryptedTaskPayload,
    type TaskData
} from '../lib/cryptoUtils';
import { pqcWorkerManager } from '../lib/pqcWorkerManager';

export type { EncryptedTask, EncryptedTaskPayload, TaskData };

export const useTaskEncryption = () => {
    const { user, setCryptoStatus } = useSessionStore();

    /**
     * Encrypt task data (title, description, notes) using ML-KEM-768 + AES-256-GCM
     */
    const encryptTaskDataFn = useCallback(async (data: TaskData): Promise<EncryptedTaskPayload> => {
        if (!user || !user.publicKey) {
            throw new Error('User public key not found. PQC Engine must be operational.');
        }

        try {
            setCryptoStatus('encrypting');
            return await encryptTaskData(data, user.publicKey);
        } finally {
            setCryptoStatus('idle');
        }
    }, [user, setCryptoStatus]);

    /**
     * Decrypt a single encrypted task
     */
    const decryptTaskDataFn = useCallback(async (encryptedTask: EncryptedTask): Promise<TaskData & {
        _id: string;
        dueDate?: string;
        priority: 'high' | 'medium' | 'low';
        status: 'todo' | 'in_progress' | 'done';
        order: number;
        createdAt: string;
        updatedAt: string;
    }> => {
        if (!user || !user.privateKey) {
            throw new Error('User private key not found. PQC Engine must be operational.');
        }

        return await decryptTaskData(encryptedTask, user.privateKey);
    }, [user]);

    /**
     * Decrypt multiple tasks in parallel
     */
    const decryptTasks = useCallback(async (encryptedTasks: EncryptedTask[]) => {
        try {
            setCryptoStatus('decrypting');

            if (!user || !user.privateKey) {
                // Should not happen if decryptTasks is called
                return [];
            }

            // Offload to worker
            const result = await pqcWorkerManager.batchDecryptTasks(encryptedTasks, user.privateKey);

            // If the manager returns an array (old behavior fallback), normalize it
            if (Array.isArray(result)) {
                return { tasks: result, failedTaskIds: [] };
            }
            return result; // { tasks: ..., failedTaskIds: ... }
        } catch (error) {
            console.error('Batch decryption failed:', error);
            throw error;
        } finally {
            setCryptoStatus('idle');
        }
    }, [user, setCryptoStatus]);

    /**
     * Generate SHA-256 record hash for integrity verification
     */
    const generateRecordHashFn = useCallback(async (
        data: TaskData,
        priority: string,
        status: string,
        dueDate?: string
    ): Promise<string> => {
        return generateRecordHash(data, priority, status, dueDate);
    }, []);

    return {
        encryptTaskData: encryptTaskDataFn,
        decryptTaskData: decryptTaskDataFn,
        decryptTasks,
        generateRecordHash: generateRecordHashFn,
    };
};
