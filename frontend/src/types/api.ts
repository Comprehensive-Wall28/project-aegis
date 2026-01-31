export interface ApiError {
    message: string;
    code?: string;
    status?: number;
    details?: Record<string, unknown>;
}
