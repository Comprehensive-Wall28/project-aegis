import apiClient from './api';

// Types for system logs
export type LogLevel = 'info' | 'warn' | 'error';

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
    // Performance metrics
    duration?: number;
    requestSize?: number;
    responseSize?: number;
    memoryUsage?: number;
}

export interface SystemLogStats {
    totalLogs: number;
    errorCount: number;
    warnCount: number;
    infoCount: number;
    last24Hours: {
        errors: number;
        warnings: number;
        info: number;
    };
    byHour: Array<{
        hour: string;
        errors: number;
        warnings: number;
        info: number;
    }>;
    byDay: Array<{
        date: string;
        errors: number;
        warnings: number;
        info: number;
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

// Performance Analytics Types
export interface PerformanceStats {
    totalRequests: number;
    avgDuration: number;
    minDuration: number;
    maxDuration: number;
    p50Duration: number;
    p90Duration: number;
    p99Duration: number;
    errorRate: number;
    avgRequestSize: number;
    avgResponseSize: number;
    avgMemoryUsage: number;
}

export interface EndpointPerformance {
    url: string;
    method: string;
    count: number;
    avgDuration: number;
    minDuration: number;
    maxDuration: number;
    p50Duration: number;
    p90Duration: number;
    p99Duration: number;
    errorCount: number;
    errorRate: number;
}

export interface PerformanceTrendPoint {
    timestamp: string;
    avgDuration: number;
    requestCount: number;
    errorCount: number;
    p95Duration: number;
}

export interface SlowestRequest {
    _id: string;
    url: string;
    method: string;
    duration: number;
    statusCode: number;
    timestamp: string;
    userId?: string;
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

    // ============================================
    // Performance Analytics
    // ============================================

    /**
     * Get comprehensive performance statistics
     */
    getPerformanceStats: async (hours: number = 24): Promise<PerformanceStats> => {
        const response = await apiClient.get<PerformanceStats>(`/admin/performance/stats?hours=${hours}`);
        return response.data;
    },

    /**
     * Get per-endpoint performance breakdown
     */
    getEndpointPerformance: async (hours: number = 24, limit: number = 20): Promise<EndpointPerformance[]> => {
        const response = await apiClient.get<EndpointPerformance[]>(`/admin/performance/endpoints?hours=${hours}&limit=${limit}`);
        return response.data;
    },

    /**
     * Get performance trends over time
     */
    getPerformanceTrends: async (hours: number = 24): Promise<PerformanceTrendPoint[]> => {
        const response = await apiClient.get<PerformanceTrendPoint[]>(`/admin/performance/trends?hours=${hours}`);
        return response.data;
    },

    /**
     * Get slowest requests
     */
    getSlowestRequests: async (hours: number = 24, limit: number = 20): Promise<SlowestRequest[]> => {
        const response = await apiClient.get<SlowestRequest[]>(`/admin/performance/slowest?hours=${hours}&limit=${limit}`);
        return response.data;
    },
};

export default adminService;
