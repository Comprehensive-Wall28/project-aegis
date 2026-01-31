import { useContext } from 'react';
import BackendStatusContext from './BackendStatusContext';

interface BackendStatusContextType {
    isBackendDown: boolean;
    setBackendDown: (down: boolean) => void;
    resetBackendStatus: () => void;
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
