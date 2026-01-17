import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import authService from '@/services/authService';
import { useSessionStore } from '@/stores/sessionStore';
import { storeSeed } from '@/lib/cryptoUtils';
import { refreshCsrfToken } from '@/services/api';

export function useAuthForm(open: boolean, initialMode: 'login' | 'register', onClose: () => void) {
    const navigate = useNavigate();
    const { setUser, initializeQuantumKeys } = useSessionStore();

    // Form State
    const [isRegisterMode, setIsRegisterMode] = useState(initialMode === 'register');
    const [loading, setLoading] = useState(false);
    const [email, setEmail] = useState('');
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [show2FA, setShow2FA] = useState(false);
    const [authOptions, setAuthOptions] = useState<any>(null);

    // Track open count to force fresh state on each open
    const [openCount, setOpenCount] = useState(0);
    const prevOpenRef = useRef(false);

    // Sync mode with initialMode when dialog opens
    useEffect(() => {
        if (open && !prevOpenRef.current) {
            // Dialog just opened - reset everything and increment count
            setIsRegisterMode(initialMode === 'register');
            resetForm();
            setOpenCount(c => c + 1);
        }
        prevOpenRef.current = open;
    }, [open, initialMode]);

    const resetForm = () => {
        setEmail('');
        setUsername('');
        setPassword('');
        setError('');
        setSuccess('');
        setShow2FA(false);
        setAuthOptions(null);
    };

    const toggleMode = () => {
        setIsRegisterMode(!isRegisterMode);
        setError('');
        setSuccess('');
    };

    const handleAuth = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        setLoading(true);
        setError('');

        try {
            if (isRegisterMode) {
                await authService.register(username, email, password);
                setSuccess('Vault created successfully! Please login to continue.');
                setIsRegisterMode(false);
                setPassword('');
            } else {
                const response = await authService.login(email, password);

                if (response.status === '2FA_REQUIRED') {
                    setAuthOptions(response.options);
                    setShow2FA(true);
                    setLoading(false);
                    // Automatically trigger passkey auth after a short delay for UX
                    setTimeout(() => handleComplete2FA(response.options), 500);
                    return;
                }

                setUser({ _id: response._id, email: response.email, username: response.username });
                if (response.pqcSeed) {
                    storeSeed(response.pqcSeed);
                    initializeQuantumKeys(response.pqcSeed);
                }
                await refreshCsrfToken();
                onClose();
                navigate('/dashboard');
            }
        } catch (err: any) {
            console.error(err);
            if (err.code === 'ERR_NETWORK' || err.message === 'Network Error') {
                onClose();
                navigate('/backend-down');
                return;
            }
            setError(err.response?.data?.message || 'Authentication failed');
        } finally {
            setLoading(false);
        }
    };

    const handleComplete2FA = async (options = authOptions) => {
        if (!options) return;
        setLoading(true);
        setError('');

        try {
            // Use consolidated authService method which handles Passkey verify + V1/V2 fallback
            const response = await authService.loginWithPasskey(email, password);

            if (response._id) {
                setUser({ _id: response._id, email: response.email, username: response.username });
                if (response.pqcSeed) {
                    storeSeed(response.pqcSeed);
                    initializeQuantumKeys(response.pqcSeed);
                }
                await refreshCsrfToken();
                onClose();
                navigate('/dashboard');
            }
        } catch (err: any) {
            console.error(err);
            setError(err.response?.data?.message || 'Passkey 2FA failed');
            setShow2FA(false);
        } finally {
            setLoading(false);
        }
    };

    return {
        state: {
            isRegisterMode,
            loading,
            email,
            username,
            password,
            error,
            success,
            show2FA,
            openCount,
            authOptions
        },
        actions: {
            setEmail,
            setUsername,
            setPassword,
            setError,
            setSuccess,
            toggleMode,
            handleAuth,
            handleComplete2FA,
            setShow2FA,
            resetForm
        }
    };
}
