import { createContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import apiClient from '@/services/api';
import { BackendDown } from '@/components/BackendDown';
import { isBackendUnavailableError } from './backendStatusUtils';

interface BackendStatusContextType {
    isBackendDown: boolean;
    setBackendDown: (down: boolean) => void;
    resetBackendStatus: () => void;
}

const BackendStatusContext = createContext<BackendStatusContextType | undefined>(undefined);

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

export default BackendStatusContext;
