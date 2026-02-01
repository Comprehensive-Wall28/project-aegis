import apiClient from './api';

// Types for system logs
export type LogLevel = 'warn' | 'error';

export interface SystemLog {
    _id: string;
    level: LogLevel;
    message: string;
    timestamp: string;
    service: string;
    method?: string;
    url?: string;
    userId?: string;
    statusCode?: number;
    error?: string;
    stack?: string;
    metadata?: Record<string, unknown>;
}

export interface SystemLogStats {
    totalLogs: number;
    errorCount: number;
    warnCount: number;
    last24Hours: {
        errors: number;
        warnings: number;
    };
    byHour: Array<{
        hour: string;
        errors: number;
        warnings: number;
    }>;
    byDay: Array<{
        date: string;
        errors: number;
        warnings: number;
    }>;
    topUrls: Array<{
        url: string;
        count: number;
    }>;
    topUsers: Array<{
        userId: string;
        count: number;
    }>;
}

export interface LogsResponse {
    items: SystemLog[];
    total: number;
    totalPages: number;
    page: number;
    limit: number;
}

export interface LogFilterOptions {
    methods: string[];
    statusCodes: number[];
    levels: string[];
}

export interface GetLogsParams {
    page?: number;
    limit?: number;
    level?: LogLevel;
    startDate?: string;
    endDate?: string;
    userId?: string;
    url?: string;
    search?: string;
    method?: string;
    statusCode?: number;
    sortField?: string;
    sortOrder?: 'asc' | 'desc';
}

const adminService = {
    /**
     * Get paginated system logs with filtering
     */
    getLogs: async (params: GetLogsParams = {}): Promise<LogsResponse> => {
        const queryParams = new URLSearchParams();
        
        Object.entries(params).forEach(([key, value]) => {
            if (value !== undefined && value !== null && value !== '') {
                queryParams.append(key, String(value));
            }
        });
        
        const response = await apiClient.get<LogsResponse>(`/admin/logs?${queryParams.toString()}`);
        return response.data;
    },

    /**
     * Get a single log by ID
     */
    getLogById: async (id: string): Promise<SystemLog> => {
        const response = await apiClient.get<SystemLog>(`/admin/logs/${id}`);
        return response.data;
    },

    /**
     * Get aggregated statistics for dashboard
     */
    getStats: async (days: number = 7): Promise<SystemLogStats> => {
        const response = await apiClient.get<SystemLogStats>(`/admin/logs/stats?days=${days}`);
        return response.data;
    },

    /**
     * Get filter options for dropdowns
     */
    getFilterOptions: async (): Promise<LogFilterOptions> => {
        const response = await apiClient.get<LogFilterOptions>('/admin/logs/filter-options');
        return response.data;
    },
};

export default adminService;
