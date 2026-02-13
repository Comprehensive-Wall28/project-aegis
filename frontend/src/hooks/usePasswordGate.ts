import { useState } from 'react';

// Initialize from sessionStorage synchronously
const getInitialAuthState = () => {
    const storedPassword = sessionStorage.getItem('analytics_password');
    return {
        password: storedPassword || '',
        isAuthenticated: !!storedPassword,
    };
};

export function usePasswordGate() {
    const [{ isAuthenticated, password }, setAuthState] = useState(getInitialAuthState);

    const setPassword = (newPassword: string) => {
        setAuthState(prev => ({ ...prev, password: newPassword }));
    };

    const setIsAuthenticated = (authenticated: boolean) => {
        setAuthState(prev => ({ ...prev, isAuthenticated: authenticated }));
    };

    const onAccessGranted = (providedPassword: string) => {
        sessionStorage.setItem('analytics_password', providedPassword);
        setPassword(providedPassword);
        setIsAuthenticated(true);
    };

    const logout = () => {
        sessionStorage.removeItem('analytics_password');
        setPassword('');
        setIsAuthenticated(false);
    };

    return {
        isAuthenticated,
        password,
        onAccessGranted,
        logout,
    };
}
