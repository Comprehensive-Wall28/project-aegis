import apiClient from './api';

export interface ApiMetric {
    _id: string;
    method: string;
    path: string;
    statusCode: number;
    durationMs: number;
    userId?: string;
    ipAddress: string;
    userAgent?: string;
    timestamp: string;
    metadata?: {
        query?: Record<string, any>;
        contentLength?: number;
        errorMessage?: string;
    };
}

export interface LogEntry {
    _id: string;
    level: 'INFO' | 'WARN' | 'ERROR';
    message: string;
    source: string;
    metadata?: Record<string, any>;
    timestamp: string;
    stackTrace?: string;
    userId?: string;
    requestId?: string;
}

export interface AuditLogEntry {
    _id: string;
    userId?: string;
    identifier?: string;
    action: string;
    status: 'SUCCESS' | 'FAILURE';
    ipAddress: string;
    metadata: Record<string, any>;
    timestamp: string;
}

export interface MetricsSummary {
    totalRequests: number;
    avgDurationMs: number;
    maxDurationMs?: number;
    minDurationMs?: number;
    errorCount: number;
    errorRate: number;
    uniqueUserCount: number;
}

export interface MetricsResponse {
    success: boolean;
    data: ApiMetric[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        pages: number;
    };
}

export interface SummaryResponse {
    success: boolean;
    data: {
        summary: MetricsSummary;
        statusDistribution: Array<{ _id: number; count: number }>;
        topPaths: Array<{ path: string; method: string; count: number; avgDurationMs: number }>;
    };
}

export interface TimeseriesResponse {
    success: boolean;
    data: Array<{
        timestamp: string;
        requests: number;
        avgDurationMs: number;
        errors: number;
        uniqueUsers: number;
    }>;
}

export interface LogsResponse {
    success: boolean;
    data: LogEntry[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        pages: number;
    };
}

export interface AuditLogsResponse {
    success: boolean;
    data: AuditLogEntry[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        pages: number;
    };
}

/**
 * Verify analytics access password
 */
export const verifyAnalyticsAccess = async (password: string): Promise<boolean> => {
    try {
        const response = await apiClient.post('/analytics/verify-access', { password });
        return response.data.success === true;
    } catch (error) {
        return false;
    }
};

/**
 * Get API metrics with search and pagination
 */
export const getMetrics = async (
    password: string,
    filters?: {
        search?: string;
        statusCode?: number;
        startDate?: string;
        endDate?: string;
        page?: number;
        limit?: number;
    }
): Promise<MetricsResponse> => {
    const params = new URLSearchParams();

    if (filters?.search) params.append('search', filters.search);
    if (filters?.statusCode) params.append('statusCode', filters.statusCode.toString());
    if (filters?.startDate) params.append('startDate', filters.startDate);
    if (filters?.endDate) params.append('endDate', filters.endDate);
    if (filters?.page) params.append('page', filters.page.toString());
    if (filters?.limit) params.append('limit', filters.limit.toString());

    const response = await apiClient.get(`/analytics/metrics?${params.toString()}`, {
        headers: {
            'X-Analytics-Password': password,
        },
    });

    return response.data;
};

/**
 * Get metrics summary with optional search
 */
export const getMetricsSummary = async (
    password: string,
    filters?: {
        search?: string;
        startDate?: string;
        endDate?: string;
    }
): Promise<SummaryResponse> => {
    const params = new URLSearchParams();

    if (filters?.search) params.append('search', filters.search);
    if (filters?.startDate) params.append('startDate', filters.startDate);
    if (filters?.endDate) params.append('endDate', filters.endDate);

    const response = await apiClient.get(`/analytics/metrics/summary?${params.toString()}`, {
        headers: {
            'X-Analytics-Password': password,
        },
    });

    return response.data;
};

/**
 * Get time-series data for charts with optional search
 */
export const getMetricsTimeseries = async (
    password: string,
    filters?: {
        search?: string;
        startDate?: string;
        endDate?: string;
        interval?: '1m' | '1h' | '1d';
        hours?: number;
    }
): Promise<TimeseriesResponse> => {
    const params = new URLSearchParams();

    if (filters?.search) params.append('search', filters.search);
    if (filters?.startDate) params.append('startDate', filters.startDate);
    if (filters?.endDate) params.append('endDate', filters.endDate);
    if (filters?.interval) params.append('interval', filters.interval);
    if (filters?.hours) params.append('hours', filters.hours.toString());

    const response = await apiClient.get(`/analytics/metrics/timeseries?${params.toString()}`, {
        headers: {
            'X-Analytics-Password': password,
        },
    });

    return response.data;
};

/**
 * Get structured logs with search and pagination
 */
export const getLogs = async (
    password: string,
    filters?: {
        search?: string;
        level?: 'INFO' | 'WARN' | 'ERROR';
        page?: number;
        limit?: number;
    }
): Promise<LogsResponse> => {
    const params = new URLSearchParams();

    if (filters?.search) params.append('search', filters.search);
    if (filters?.level) params.append('level', filters.level);
    if (filters?.page) params.append('page', filters.page.toString());
    if (filters?.limit) params.append('limit', filters.limit.toString());

    const response = await apiClient.get(`/analytics/logs?${params.toString()}`, {
        headers: {
            'X-Analytics-Password': password,
        },
    });

    return response.data;
};

/**
 * Get system-wide audit logs for analytics with search and pagination
 */
export const getAuditLogs = async (
    password: string,
    filters?: {
        search?: string;
        status?: 'SUCCESS' | 'FAILURE';
        page?: number;
        limit?: number;
    }
): Promise<AuditLogsResponse> => {
    const params = new URLSearchParams();

    if (filters?.search) params.append('search', filters.search);
    if (filters?.status) params.append('status', filters.status);
    if (filters?.page) params.append('page', filters.page.toString());
    if (filters?.limit) params.append('limit', filters.limit.toString());

    const response = await apiClient.get(`/analytics/audit-logs?${params.toString()}`, {
        headers: {
            'X-Analytics-Password': password,
        },
    });

    return response.data;
};

export default {
    verifyAnalyticsAccess,
    getMetrics,
    getMetricsSummary,
    getMetricsTimeseries,
    getLogs,
    getAuditLogs,
};
