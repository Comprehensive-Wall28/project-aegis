import { useState, useEffect } from 'react';

export function usePasswordGate() {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [password, setPassword] = useState('');

    useEffect(() => {
        // Check for existing password in sessionStorage
        const storedPassword = sessionStorage.getItem('analytics_password');
        if (storedPassword) {
            setPassword(storedPassword);
            setIsAuthenticated(true);
        }
    }, []);

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
