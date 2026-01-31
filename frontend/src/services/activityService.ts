import apiClient from './api';
import type { AuditLog } from './auditService';
import type { EncryptedTask } from './taskService';

const PREFIX = '/activity';

export interface DashboardActivityResponse {
    tasks: EncryptedTask[];
    activities: AuditLog[];
}

const activityService = {
    /**
     * Get combined dashboard activity (tasks + audit logs).
     * Returns optimized payload with max 3 items total.
     */
    getDashboardActivity: async (): Promise<DashboardActivityResponse> => {
        const response = await apiClient.get<DashboardActivityResponse>(`${PREFIX}/dashboard`);
        return response.data;
    }
};

export default activityService;
