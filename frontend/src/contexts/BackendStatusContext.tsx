import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import apiClient from '@/services/api';
import { BackendDown } from '@/components/BackendDown';
import { AxiosError } from 'axios';

interface BackendStatusContextType {
    isBackendDown: boolean;
    setBackendDown: (down: boolean) => void;
    resetBackendStatus: () => void;
}

const BackendStatusContext = createContext<BackendStatusContextType | undefined>(undefined);

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

interface BackendStatusProviderProps {
    children: ReactNode;
}

export function BackendStatusProvider({ children }: BackendStatusProviderProps) {
    const [isBackendDown, setIsBackendDown] = useState(false);
    
    const setBackendDown = useCallback((down: boolean) => {
        setIsBackendDown(down);
    }, []);

    const resetBackendStatus = useCallback(() => {
        setIsBackendDown(false);
    }, []);

    const handleRetry = useCallback(() => {
        // Full page reload to retry - this resets all state naturally
        window.location.reload();
    }, []);

    // Setup axios interceptor
    useEffect(() => {
        const interceptorId = apiClient.interceptors.response.use(
            (response) => response,
            (error: AxiosError) => {
                if (isBackendUnavailableError(error)) {
                    setIsBackendDown(true);
                }
                return Promise.reject(error);
            }
        );

        return () => {
            apiClient.interceptors.response.eject(interceptorId);
        };
    }, []);

    return (
        <BackendStatusContext.Provider value={{ isBackendDown, setBackendDown, resetBackendStatus }}>
            {isBackendDown ? (
                <div className="min-h-screen bg-black flex items-center justify-center">
                    <BackendDown onRetry={handleRetry} />
                </div>
            ) : (
                children
            )}
        </BackendStatusContext.Provider>
    );
}

/**
 * Hook to access the backend status context
 */
export function useBackendStatus(): BackendStatusContextType {
    const context = useContext(BackendStatusContext);
    if (!context) {
        throw new Error('useBackendStatus must be used within a BackendStatusProvider');
    }
    return context;
}

export default BackendStatusContext;
