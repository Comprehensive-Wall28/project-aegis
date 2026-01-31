import { AxiosError } from 'axios';

/**
 * Check if an error indicates the backend is unavailable.
 * Can be used by components/hooks to determine if they should handle the error locally
 * or let the global handler take care of it.
 */
export function isBackendUnavailableError(error: unknown): boolean {
    // Not an axios error
    if (!error || typeof error !== 'object') return false;
    
    const axiosError = error as AxiosError;
    
    // Network errors (no response)
    if (!axiosError.response) {
        return axiosError.code === 'ERR_NETWORK' || 
               axiosError.code === 'ECONNREFUSED' ||
               axiosError.message?.includes('Network Error') ||
               axiosError.message?.includes('timeout');
    }
    
    // HTTP status codes indicating backend/infrastructure issues
    const status = axiosError.response.status;
    return status === 503 || // Service Unavailable
           status === 502 || // Bad Gateway
           status === 504;   // Gateway Timeout
}
